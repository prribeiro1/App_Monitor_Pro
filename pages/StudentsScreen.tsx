import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dbService } from '../services/db';
import { Stop, Student, Route } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { authService, supabase } from '../services/auth';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir ícone padrão do Leaflet no build
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

export const StudentsScreen: React.FC = () => {
  const { language } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Labels de turnos pelo idioma
  const shiftLabels: Record<string, string> = language === 'es'
    ? { integral: 'Tiempo Completo', manha: 'Mañana', tarde: 'Tarde', noite: 'Noche' }
    : { integral: 'Integral', manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

  // Modal de detalhes do aluno
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [school, setSchool] = useState('');
  const [shift, setShift] = useState<'integral' | 'manha' | 'tarde' | 'noite'>('manha');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [observation, setObservation] = useState('');
  const [monthlyFees, setMonthlyFees] = useState('');
  const [dueDay, setDueDay] = useState('');

  // 🆕 NOVA ESTRUTURA (sem pontos)
  const [address, setAddress] = useState('');
  const [addressSearch, setAddressSearch] = useState(''); // Estado para o campo de busca
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [routeOrder, setRouteOrder] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false); // 🆕 Garantir centralização única

  // 🆕 Componente para capturar clique no mapa e centralização automática
  const MapEvents = () => {
    const map = useMap(); // Usar hook do leaflet

    useEffect(() => {
      if (showAddressMap && !mapInitialized) {
        // Tentar centralizar na posição do usuário ao abrir pela primeira vez
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            map.setView([lat, lng], 16);
            setMapInitialized(true);
            // Se ainda não tiver latitude/longitude setada, usa a do GPS
            if (!latitude || !longitude) {
              setLatitude(lat);
              setLongitude(lng);
            }
          },
          (err) => console.warn('Erro ao obter GPS para o mapa:', err),
          { enableHighAccuracy: true }
        );
      }
    }, [showAddressMap, mapInitialized, map]);

    useMapEvents({
      click(e) {
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
      },
    });
    return null;
  };

  // 🆕 Buscar sugestões de endereço (Photon API - Mais estável)
  const handleAddressSearch = async (value: string) => {
    setAddressSearch(value);
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearchingAddress(true);
    try {
      // Tentativa 1: Photon (Mais rápido)
      const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5&lang=pt`);
      const data = await resp.json();

      if (data.features && data.features.length > 0) {
        setSuggestions(data.features);
      } else {
        // Fallback: Nominatim (Caso Photon venha vazio)
        console.log('Photon sem resultados, tentando Nominatim...');
        const nomResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1&countrycodes=br`);
        const nomData = await nomResp.json();

        // Converter formato Nominatim para o esperado (GeoJSON features)
        const converted = nomData.map((item: any) => ({
          properties: {
            name: item.display_name,
            street: item.address?.road || item.display_name,
            city: item.address?.city || item.address?.town,
            state: item.address?.state
          },
          geometry: {
            coordinates: [parseFloat(item.lon), parseFloat(item.lat)]
          }
        }));
        setSuggestions(converted);
      }
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectSuggestion = (sug: any) => {
    const { name, street, housenumber, city, state } = sug.properties;

    // Montagem amigável do endereço
    let fullAddr = name || '';
    if (street && street !== name) fullAddr = `${street}${housenumber ? `, ${housenumber}` : ''}${name ? ` (${name})` : ''}`;
    if (city) fullAddr += ` - ${city}`;
    if (state) fullAddr += `, ${state}`;

    setAddress(fullAddr);
    setAddressSearch(''); // Limpa busca
    setLatitude(sug.geometry.coordinates[1]);
    setLongitude(sug.geometry.coordinates[0]);
    setSuggestions([]);
    setShowAddressMap(true); // Abre mapa para confirmação
  };

  // 🆕 Capturar localização GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste navegador');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLoadingLocation(false);
        alert('Localização capturada com sucesso!');
      },
      (error) => {
        console.error('Erro ao capturar localização:', error);
        alert('Não foi possível capturar a localização. Verifique as permissões.');
        setIsLoadingLocation(false);
      }
    );
  };

  // 🆕 Verifica se é aniversário do aluno
  const isBirthday = (student: Student) => {
    if (!student.birthDate) return false;
    const todayDate = new Date();
    const [year, month, day] = student.birthDate.split('-').map(Number);
    return todayDate.getDate() === day && (todayDate.getMonth() + 1) === month;
  };

  // 🛠️ MONITOR PRO FIX: Usar URLs limpas para evitar choque com Landing Page
  const handleShareInvite = async () => {
    const user = await authService.getCurrentUser();
    if (!user) return;

    // 🛠️ MONITOR PRO FIX: No APK, window.location.origin é localhost. 
    // Forçamos o link da branch para o teste de hoje.
    const baseUrl = 'https://app-monitor-pro-git-fea-7f0621-paulo-ricardos-projects-e065d0ea.vercel.app';
    const shareUrl = `${baseUrl}/cadastro-aluno/${user.id}`;
    const message = `Olá! 🚐 Para facilitar o cadastro do seu filho no Monitor Escolar PRO, clique no link abaixo e preencha a ficha:\n\n${shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchData = async () => {
    const [st, sp, rt] = await Promise.all([
      dbService.getStudents(),
      dbService.getStops(),
      dbService.getRoutes()
    ]);

    // 🆕 Ordenar por Rota primeiro, depois por Ordem na Rota
    st.sort((a, b) => {
      // 1. Pegar nomes das rotas para agrupamento visual (ou 'Z' para sem rota ficarem por último)
      const routeA = rt.find(r => r.id === a.routeId)?.name || 'ZZZZ';
      const routeB = rt.find(r => r.id === b.routeId)?.name || 'ZZZZ';

      if (routeA !== routeB) return routeA.localeCompare(routeB);

      // 2. Dentro da mesma rota, usar a ordem definida
      return (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0);
    });

    sp.sort((a, b) => a.order - b.order);

    setStudents(st);
    setStops(sp);
    setRoutes(rt);

    // Inicializar com primeira rota se disponível
    if (rt.length > 0 && !selectedRouteId) {
      setSelectedRouteId(rt[0].id);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Abrir aluno via URL (busca global)
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && students.length > 0) {
      const student = students.find(s => s.id === openId);
      if (student) {
        setSelectedStudent(student);
        // Limpar o parâmetro da URL
        setSearchParams({});
      }
    }
  }, [searchParams, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const existing = editingId ? students.find(s => s.id === editingId) : null;

    const student: Student = {
      id: editingId || crypto.randomUUID(),
      stopId: '', // Não usa mais pontos
      name: studentName,
      active: true,
      birthDate: birthDate || undefined,
      school: school || undefined,
      shift: shift || undefined,
      guardianName: guardianName || undefined,
      responsibleCpf: responsibleCpf || undefined,
      responsibleEmail: responsibleEmail || undefined,
      responsiblePhone: responsiblePhone || undefined,
      observation: observation || undefined,
      monthlyFees: monthlyFees ? parseFloat(monthlyFees.replace(',', '.')) : 0,
      dueDay: dueDay ? parseInt(dueDay) : 0,
      order: existing?.order || Date.now(),

      // 🆕 NOVA ESTRUTURA (obrigatório)
      routeId: selectedRouteId,
      address: address || undefined,
      latitude: latitude,
      longitude: longitude,
      routeOrder: routeOrder ? parseInt(routeOrder) : 0,
    };

    await dbService.saveStudent(student);
    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setStudentName('');
    setBirthDate('');
    setSchool('');
    setShift('manha');
    setGuardianName('');
    setResponsibleCpf('');
    setResponsibleEmail('');
    setResponsiblePhone('');
    setObservation('');
    setMonthlyFees('');
    setDueDay('');
    setEditingId(null);

    // 🆕 Limpar novos campos
    setAddress('');
    setLatitude(undefined);
    setLongitude(undefined);
    setRouteOrder('');
    setShowAddressMap(false);
    setSuggestions([]);

    if (routes.length > 0) {
      setSelectedRouteId(routes[0].id);
    }
  };

  const populateForm = (student: Student) => {
    setStudentName(student.name);
    setBirthDate(student.birthDate || '');
    setSchool(student.school || '');
    setShift(student.shift || 'manha');
    setGuardianName(student.guardianName || '');
    setResponsibleCpf(student.responsibleCpf || '');
    setResponsibleEmail(student.responsibleEmail || '');
    setResponsiblePhone(student.responsiblePhone || '');
    setObservation(student.observation || '');
    setMonthlyFees(student.monthlyFees ? student.monthlyFees.toString() : '');
    setDueDay(student.dueDay ? student.dueDay.toString() : '');
    setEditingId(student.id);

    // 🆕 NOVA ESTRUTURA
    setSelectedRouteId(student.routeId || '');
    setAddress(student.address || '');
    setLatitude(student.latitude);
    setLongitude(student.longitude);
    setRouteOrder(student.routeOrder ? student.routeOrder.toString() : '');
    setShowAddressMap(!!(student.latitude && student.longitude));
    setSuggestions([]);

    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const handleRouteChange = (newRouteId: string) => {
    setSelectedRouteId(newRouteId);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover aluno?')) {
      await dbService.deleteStudent(id);
      setSelectedStudent(null);
      fetchData();
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber) {
      window.open(`https://wa.me/55${cleanNumber}`, '_blank');
    } else {
      alert('Número inválido para WhatsApp');
    }
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return '';
    const route = routes.find(r => r.id === routeId);
    return route?.name || '';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Alunos</h2>
        <div className="flex gap-2">
          <button
            onClick={handleShareInvite}
            title="Convidar Pais (WhatsApp)"
            className="bg-navy-700 hover:bg-navy-600 text-primary-400 p-3 rounded-full shadow-lg border border-navy-600"
          >
            <Icon name="share-2" />
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-full shadow-lg"
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {students.map((student) => (
          <div
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className="bg-navy-800 p-3 rounded-xl border border-navy-700 flex items-center justify-between cursor-pointer hover:bg-navy-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <InitialsAvatar name={student.name} />
              <div>
                <span className="text-white font-medium flex items-center gap-1">
                  {student.observation && (
                    <span className="text-orange-400" title="Possui observação">⚠️</span>
                  )}
                  {student.name}
                </span>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {student.school && <div>{student.school}</div>}
                  {student.routeId && (
                    <div className="text-primary-400">
                      📍 {getRouteName(student.routeId)}
                    </div>
                  )}
                  {isBirthday(student) && (
                    <div className="text-pink-400 flex items-center gap-1 font-bold text-[10px] animate-pulse">
                      🎂 Hoje é aniversário!
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Icon name="chevron-right" size={20} className="text-gray-500" />
          </div>
        ))}
        {students.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhum aluno cadastrado.</p>}
      </div>

      {/* Modal de Detalhes do Aluno */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-navy-900 h-full flex flex-col">
            {/* Header */}
            <div className="bg-navy-800 px-4 py-4 flex items-center justify-between border-b border-navy-700">
              <button onClick={() => setSelectedStudent(null)} className="p-2 text-gray-400 hover:text-white">
                <Icon name="arrow-left" size={24} />
              </button>
              <h3 className="text-lg font-bold text-white">Aluno</h3>
              <button onClick={() => populateForm(selectedStudent)} className="text-primary-400 font-bold">
                Editar
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Nome do Aluno */}
              <div className="bg-navy-800 rounded-xl p-4 mb-4 border border-navy-700">
                <div className="flex items-center gap-3 mb-4">
                  <InitialsAvatar name={selectedStudent.name} />
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedStudent.observation && <span className="text-orange-400">⚠️</span>}
                      {selectedStudent.name}
                    </h2>
                    {selectedStudent.shift && (
                      <span className="text-sm text-gray-400">{shiftLabels[selectedStudent.shift]}</span>
                    )}
                  </div>
                </div>

                {/* Dados do Aluno */}
                <div className="space-y-3">
                  {selectedStudent.birthDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data Nascimento</span>
                      <span className="text-white">{formatDate(selectedStudent.birthDate)}</span>
                    </div>
                  )}
                  {selectedStudent.school && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Escola</span>
                      <span className="text-white">{selectedStudent.school}</span>
                    </div>
                  )}
                  {selectedStudent.routeId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rota</span>
                      <span className="text-white">{getRouteName(selectedStudent.routeId)}</span>
                    </div>
                  )}
                  {selectedStudent.address && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Endereço</span>
                      <span className="text-white text-right">{selectedStudent.address}</span>
                    </div>
                  )}
                  {selectedStudent.routeOrder != null && selectedStudent.routeOrder > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ordem na Rota</span>
                      <span className="text-white">#{selectedStudent.routeOrder}</span>
                    </div>
                  )}
                  {selectedStudent.estimatedPickupTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Horário Estimado</span>
                      <span className="text-white">{selectedStudent.estimatedPickupTime}</span>
                    </div>
                  )}
                  {selectedStudent.monthlyFees && selectedStudent.monthlyFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mensalidade</span>
                      <span className="text-green-400">R$ {selectedStudent.monthlyFees.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedStudent.dueDay && selectedStudent.dueDay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vencimento</span>
                      <span className="text-white">Dia {selectedStudent.dueDay}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observação */}
              {selectedStudent.observation && (
                <div className="bg-orange-500/10 rounded-xl p-4 mb-4 border border-orange-500/30">
                  <h4 className="text-orange-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <Icon name="alert-triangle" size={14} />
                    Observação Importante
                  </h4>
                  <p className="text-white">{selectedStudent.observation}</p>
                </div>
              )}

              {/* Responsável */}
              {(selectedStudent.guardianName || selectedStudent.responsiblePhone) && (
                <div className="bg-navy-800 rounded-xl p-4 mb-4 border border-navy-700">
                  <h4 className="text-gray-400 text-xs font-bold uppercase mb-3">Responsável</h4>

                  {selectedStudent.guardianName && (
                    <p className="text-white font-medium mb-1">{selectedStudent.guardianName}</p>
                  )}

                  {selectedStudent.responsibleCpf && (
                    <p className="text-gray-400 text-sm mb-1">CPF: {selectedStudent.responsibleCpf}</p>
                  )}

                  {selectedStudent.responsibleEmail && (
                    <p className="text-gray-400 text-sm mb-2">Email: {selectedStudent.responsibleEmail}</p>
                  )}

                  {selectedStudent.responsiblePhone && (
                    <div className="mt-3 space-y-2">
                      <p className="text-gray-400 text-sm">{selectedStudent.responsiblePhone}</p>

                      <div className="flex gap-3 mt-3">
                        <a
                          href={`tel:${selectedStudent.responsiblePhone}`}
                          className="flex-1 bg-blue-500/20 text-blue-400 py-3 rounded-xl font-bold text-center hover:bg-blue-500/30 transition"
                        >
                          Ligar
                        </a>
                        <button
                          onClick={() => openWhatsApp(selectedStudent.responsiblePhone || '')}
                          className="flex-1 bg-green-500/20 text-green-400 py-3 rounded-xl font-bold hover:bg-green-500/30 transition"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Excluir */}
              <button
                onClick={() => handleDelete(selectedStudent.id)}
                className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl font-bold border border-red-500/20 hover:bg-red-500/20 transition mt-4"
              >
                Excluir Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Aluno' : 'Novo Aluno'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nome do Aluno */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Aluno *</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  placeholder="Nome completo"
                  required
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                />
              </div>

              {/* Escola e Turno */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Escola</label>
                  <input
                    type="text"
                    value={school}
                    onChange={e => setSchool(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                    placeholder="Nome da escola"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Turno</label>
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value as any)}
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  >
                    <option value="integral">Integral</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
              </div>

              {/* Rota */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rota *</label>
                <select
                  value={selectedRouteId}
                  onChange={e => handleRouteChange(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  required
                >
                  <option value="">Selecione uma rota</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* 🆕 Busca de Endereço (Autocomplete) */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Buscar Endereço (Rua, Número...)</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={addressSearch}
                      onChange={e => handleAddressSearch(e.target.value)}
                      placeholder="Ex: Rua Direita, 100, São Paulo"
                      className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-xl focus:border-primary-500 outline-none transition"
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Sugestões Photon */}
                {suggestions.length > 0 && (
                  <div className="absolute z-[101] left-0 right-0 bg-navy-800 border-2 border-primary-500/50 rounded-xl shadow-2xl mt-2 max-h-52 overflow-y-auto backdrop-blur-md">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left p-4 text-sm text-gray-200 border-b border-navy-700 hover:bg-primary-600/20 active:bg-primary-600/40 transition-colors last:border-0"
                      >
                        <div className="flex gap-3">
                          <Icon name="map-pin" size={16} className="text-primary-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">{sug.properties.name || sug.properties.street}</p>
                            <p className="text-[10px] text-gray-500">{sug.properties.city}{sug.properties.state ? `, ${sug.properties.state}` : ''}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Endereço Final (Editável) */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Endereço Confirmado</label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Selecione acima ou digite aqui..."
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-xl h-16 text-sm resize-none"
                />
              </div>

              {/* 🆕 Localização GPS no Mapa */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Ponto no Mapa</label>
                    {latitude && longitude && (
                      <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">
                        <Icon name="check" size={10} /> Localizado
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressMap(!showAddressMap)}
                    className="text-primary-400 text-xs font-bold px-2 py-1 hover:bg-primary-500/10 rounded transition"
                  >
                    {showAddressMap ? 'Ocultar Mapa' : (latitude ? 'Ajustar Local' : 'Abrir Mapa')}
                  </button>
                </div>

                {showAddressMap && (
                  <div className="space-y-2">
                    <div className="h-60 bg-navy-900 rounded-xl overflow-hidden border-2 border-navy-700 relative z-0">
                      <MapContainer
                        center={[latitude || -23.5505, longitude || -46.6333]}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapEvents />
                        {latitude && longitude && (
                          <Marker position={[latitude, longitude]} draggable={true}
                            eventHandlers={{
                              dragend: (e) => {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                setLatitude(position.lat);
                                setLongitude(position.lng);
                              }
                            }}
                          />
                        )}
                      </MapContainer>

                      {/* Botão Flutuante para Confirmar */}
                      {latitude && longitude && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-[1000] px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddressMap(false);
                              alert('Localização confirmada! ✅');
                            }}
                            className="bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:bg-green-500 transition-all scale-110"
                          >
                            <Icon name="check" size={18} />
                            Confirmar Este Ponto
                          </button>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 bg-navy-900/80 p-2 rounded text-[10px] text-gray-400 z-[1000] pointer-events-none">
                        Arraste o pino ou clique no mapa
                      </div>
                    </div>
                    {latitude && (
                      <p className="text-[10px] text-primary-400 text-center font-mono">
                        GPS: {latitude.toFixed(6)}, {longitude?.toFixed(6)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 🆕 Localização GPS */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Localização GPS (opcional)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLoadingLocation}
                    className="flex-1 bg-blue-500/20 text-blue-400 py-3 rounded-lg font-bold hover:bg-blue-500/30 transition disabled:opacity-50"
                  >
                    {isLoadingLocation ? 'Capturando...' : latitude && longitude ? '✓ Localização Salva' : '📍 Usar Localização Atual'}
                  </button>
                  {latitude && longitude && (
                    <button
                      type="button"
                      onClick={() => { setLatitude(undefined); setLongitude(undefined); }}
                      className="bg-red-500/20 text-red-400 px-4 rounded-lg hover:bg-red-500/30 transition"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {latitude && longitude && (
                  <p className="text-xs text-gray-500 mt-1">
                    Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <hr className="border-navy-700" />

              {/* Responsável */}
              <h4 className="text-gray-400 text-xs font-bold uppercase">Dados do Responsável</h4>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Responsável</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="Ex: Maria Souza"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CPF</label>
                  <input
                    type="text"
                    value={responsibleCpf}
                    onChange={e => setResponsibleCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">WhatsApp/Tel</label>
                  <input
                    type="text"
                    value={responsiblePhone}
                    onChange={e => setResponsiblePhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email do Responsável</label>
                <input
                  type="email"
                  value={responsibleEmail}
                  onChange={e => setResponsibleEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg text-sm"
                />
              </div>

              <hr className="border-navy-700" />

              {/* Observação */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Observação <span className="text-orange-400">(alergias, condições, etc.)</span>
                </label>
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ex: Alergia a amendoim, usa óculos, precisa de adaptação..."
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg h-20"
                />
              </div>

              <hr className="border-navy-700" />

              {/* Financeiro */}
              <h4 className="text-gray-400 text-xs font-bold uppercase">Financeiro</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyFees}
                    onChange={e => setMonthlyFees(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
