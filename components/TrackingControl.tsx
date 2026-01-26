/**
 * Tracking Control Panel
 * 
 * Component for the driver to start/stop tracking
 * and share the tracking link with parents
 */

import React, { useState, useEffect } from 'react';
import { driverTracking, TrackingState } from '../services/driverTracking';
import { Icon } from './Icon';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../i18n';

interface TrackingControlProps {
    routeId?: string;
}

export const TrackingControl: React.FC<TrackingControlProps> = ({ routeId }) => {
    const { t, language } = useI18n();
    const [state, setState] = useState<TrackingState>(driverTracking.getState());
    const [shareCode, setShareCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        return driverTracking.subscribe(setState);
    }, []);

    const handleToggleTracking = async () => {
        setLoading(true);
        try {
            if (state.isTracking) {
                await driverTracking.stopTracking();
            } else {
                await driverTracking.startTracking(routeId);
                // Get share code when starting
                const code = await driverTracking.getOrCreateShareCode();
                setShareCode(code);
            }
        } catch (e: any) {
            alert(language === 'es' ? `Error: ${e.message}` : `Erro: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!shareCode) {
            setLoading(true);
            try {
                const code = await driverTracking.getOrCreateShareCode();
                setShareCode(code);
            } catch (e: any) {
                alert(language === 'es' ? `Error: ${e.message}` : `Erro: ${e.message}`);
                return;
            } finally {
                setLoading(false);
            }
        }
        setShowShareModal(true);
    };

    const getTrackingUrl = () => {
        // 🛠️ MONITOR PRO FIX: No APK o origin é localhost, então forçamos a branch
        const baseUrl = 'https://app-monitor-pro-git-fea-7f0621-paulo-ricardos-projects-e065d0ea.vercel.app';
        return `${baseUrl}/track/${shareCode}`;
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(getTrackingUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = getTrackingUrl();
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareViaWhatsApp = () => {
        const message = language === 'es'
            ? `¡Sigue mi ruta en vivo! 🚐\nAbre el link para ver donde estoy:\n${getTrackingUrl()}`
            : `Acompanhe minha rota ao vivo! 🚐\nAbra o link para ver onde estou:\n${getTrackingUrl()}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareNative = async () => {
        if (Capacitor.isNativePlatform()) {
            await Share.share({
                title: language === 'es' ? 'Rastreo en vivo' : 'Rastreamento ao vivo',
                text: language === 'es'
                    ? '¡Sigue mi ruta en vivo! 🚐'
                    : 'Acompanhe minha rota ao vivo! 🚐',
                url: getTrackingUrl(),
                dialogTitle: language === 'es' ? 'Compartir link' : 'Compartilhar link'
            });
        }
    };

    return (
        <>
            {/* Main Control Button */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${state.isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="text-white font-medium">
                            {language === 'es' ? 'Rastreo para Padres' : 'Rastreamento para Pais'}
                        </span>
                    </div>
                    {state.isTracking && (
                        <button
                            onClick={handleShare}
                            className="p-2 text-primary-400 hover:bg-navy-700 rounded-lg transition"
                        >
                            <Icon name="share-2" size={20} />
                        </button>
                    )}
                </div>

                <button
                    onClick={handleToggleTracking}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${state.isTracking
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                        <>
                            <Icon name={state.isTracking ? 'stop-circle' : 'play'} size={20} />
                            {state.isTracking
                                ? (language === 'es' ? 'Detener Rastreo' : 'Parar Rastreamento')
                                : (language === 'es' ? 'Iniciar Rastreo' : 'Iniciar Rastreamento')
                            }
                        </>
                    )}
                </button>

                {state.isTracking && state.currentLocation && (
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
                        <span>📍 {state.currentLocation.latitude.toFixed(5)}, {state.currentLocation.longitude.toFixed(5)}</span>
                        {state.currentLocation.speed && (
                            <span>🚗 {Math.round(state.currentLocation.speed)} km/h</span>
                        )}
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {showShareModal && shareCode && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {language === 'es' ? 'Compartir Link' : 'Compartilhar Link'}
                            </h3>
                            <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white p-2">
                                <Icon name="x" size={24} />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="bg-navy-900 rounded-xl p-4 mb-4">
                                <p className="text-gray-400 text-xs mb-1">
                                    {language === 'es' ? 'Código de rastreo:' : 'Código de rastreamento:'}
                                </p>
                                <p className="text-3xl font-mono font-bold text-primary-400 tracking-widest">
                                    {shareCode}
                                </p>
                            </div>
                            <p className="text-gray-400 text-sm px-2">
                                {language === 'es'
                                    ? 'Los padres pueden abrir este link para ver tu ubicación en vivo.'
                                    : 'Os pais podem abrir este link para ver sua localização ao vivo.'
                                }
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={shareViaWhatsApp}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
                            >
                                <Icon name="message-circle" size={20} />
                                {language === 'es' ? 'Compartir por WhatsApp' : 'Compartilhar via WhatsApp'}
                            </button>

                            <button
                                onClick={copyToClipboard}
                                className="w-full py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
                            >
                                <Icon name={copied ? 'check' : 'copy'} size={20} />
                                {copied
                                    ? (language === 'es' ? '¡Copiado!' : 'Copiado!')
                                    : (language === 'es' ? 'Copiar Link' : 'Copiar Link')
                                }
                            </button>

                            {Capacitor.isNativePlatform() && (
                                <button
                                    onClick={shareNative}
                                    className="w-full py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
                                >
                                    <Icon name="share" size={20} />
                                    {language === 'es' ? 'Más opciones' : 'Mais opções'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
