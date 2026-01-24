/**
 * Driver Tracking Service
 * 
 * Handles real-time location tracking using:
 * - Background Geolocation plugin for persistent tracking
 * - Supabase Broadcast for real-time updates to parents
 * - Periodic DB snapshots as fallback
 */

import { supabase } from './auth';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

// Types
export interface DriverLocation {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp: number;
}

export interface TrackingState {
    isTracking: boolean;
    currentLocation: DriverLocation | null;
    routeId?: string;
    shareCode?: string;
}

type TrackingListener = (state: TrackingState) => void;

// Constants
const BROADCAST_CHANNEL = 'driver-tracking';
const SNAPSHOT_INTERVAL = 60000; // Save to DB every 60 seconds
const BROADCAST_INTERVAL = 5000; // Broadcast every 5 seconds

class DriverTrackingService {
    private state: TrackingState = {
        isTracking: false,
        currentLocation: null,
    };

    private listeners: Set<TrackingListener> = new Set();
    private watchId: string | null = null;
    private broadcastInterval: number | null = null;
    private snapshotInterval: number | null = null;
    private channel: any = null;

    /**
     * Subscribe to tracking state changes
     */
    subscribe(listener: TrackingListener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }

    /**
     * Generate a share code for parents to access tracking
     */
    async getOrCreateShareCode(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if user already has a share code
        const { data: existing } = await supabase
            .from('tracking_links')
            .select('share_code')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (existing?.share_code) {
            this.state.shareCode = existing.share_code;
            return existing.share_code;
        }

        // Generate new code
        const shareCode = this.generateCode();

        const { error } = await supabase
            .from('tracking_links')
            .insert({
                user_id: user.id,
                share_code: shareCode,
                is_active: true
            });

        if (error) throw error;

        this.state.shareCode = shareCode;
        return shareCode;
    }

    private generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Start tracking driver location
     */
    async startTracking(routeId?: string): Promise<void> {
        if (this.state.isTracking) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        this.state.routeId = routeId;

        // Setup Supabase Broadcast channel
        this.channel = supabase.channel(`${BROADCAST_CHANNEL}:${user.id}`, {
            config: {
                broadcast: { self: false }
            }
        });
        await this.channel.subscribe();

        // Start location watching
        if (Capacitor.isNativePlatform()) {
            await this.startNativeTracking();
        } else {
            await this.startWebTracking();
        }

        // Setup broadcast interval
        this.broadcastInterval = window.setInterval(() => {
            this.broadcastLocation();
        }, BROADCAST_INTERVAL);

        // Setup snapshot interval (save to DB periodically)
        this.snapshotInterval = window.setInterval(() => {
            this.saveSnapshot();
        }, SNAPSHOT_INTERVAL);

        // Mark tracking as active in DB
        await supabase
            .from('driver_locations')
            .upsert({
                user_id: user.id,
                latitude: 0,
                longitude: 0,
                is_tracking_active: true,
                route_id: routeId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        this.state.isTracking = true;
        this.notify();

        console.log('[Tracking] Started');
    }

    private async startNativeTracking(): Promise<void> {
        try {
            this.watchId = await BackgroundGeolocation.addWatcher(
                {
                    backgroundMessage: 'Rastreamento ativo para os pais',
                    backgroundTitle: 'Monitor Escolar PRO',
                    requestPermissions: true,
                    stale: false,
                    distanceFilter: 10, // Update every 10 meters
                },
                (location, error) => {
                    if (error) {
                        console.error('[Tracking] Error:', error);
                        return;
                    }

                    if (location) {
                        this.state.currentLocation = {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            heading: location.bearing ?? undefined,
                            speed: location.speed ? location.speed * 3.6 : undefined, // m/s to km/h
                            accuracy: location.accuracy ?? undefined,
                            timestamp: Date.now()
                        };
                        this.notify();
                    }
                }
            );
        } catch (e) {
            console.error('[Tracking] Failed to start native tracking:', e);
            // Fallback to web tracking
            await this.startWebTracking();
        }
    }

    private async startWebTracking(): Promise<void> {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.state.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        heading: position.coords.heading ?? undefined,
                        speed: position.coords.speed ? position.coords.speed * 3.6 : undefined,
                        accuracy: position.coords.accuracy ?? undefined,
                        timestamp: Date.now()
                    };
                    this.notify();
                },
                (error) => {
                    console.error('[Tracking] Web geolocation error:', error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 10000
                }
            );
            this.watchId = String(watchId);
        }
    }

    /**
     * Broadcast current location to parents via Supabase Realtime
     */
    private async broadcastLocation(): Promise<void> {
        if (!this.state.currentLocation || !this.channel) return;

        try {
            await this.channel.send({
                type: 'broadcast',
                event: 'location',
                payload: this.state.currentLocation
            });
        } catch (e) {
            console.error('[Tracking] Broadcast error:', e);
        }
    }

    /**
     * Save snapshot to database (fallback for late-joining parents)
     */
    private async saveSnapshot(): Promise<void> {
        if (!this.state.currentLocation) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            await supabase
                .from('driver_locations')
                .upsert({
                    user_id: user.id,
                    latitude: this.state.currentLocation.latitude,
                    longitude: this.state.currentLocation.longitude,
                    heading: this.state.currentLocation.heading,
                    speed: this.state.currentLocation.speed,
                    accuracy: this.state.currentLocation.accuracy,
                    is_tracking_active: true,
                    route_id: this.state.routeId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        } catch (e) {
            console.error('[Tracking] Snapshot error:', e);
        }
    }

    /**
     * Stop tracking
     */
    async stopTracking(): Promise<void> {
        if (!this.state.isTracking) return;

        // Clear intervals
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }

        // Stop location watching
        if (this.watchId) {
            if (Capacitor.isNativePlatform()) {
                try {
                    await BackgroundGeolocation.removeWatcher({ id: this.watchId });
                } catch (e) {
                    console.error('[Tracking] Error removing watcher:', e);
                }
            } else {
                navigator.geolocation.clearWatch(parseInt(this.watchId));
            }
            this.watchId = null;
        }

        // Unsubscribe from channel
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }

        // Mark tracking as inactive in DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('driver_locations')
                .update({ is_tracking_active: false })
                .eq('user_id', user.id);
        }

        this.state.isTracking = false;
        this.state.currentLocation = null;
        this.notify();

        console.log('[Tracking] Stopped');
    }

    /**
     * Get current tracking state
     */
    getState(): TrackingState {
        return { ...this.state };
    }
}

// Singleton instance
export const driverTracking = new DriverTrackingService();
