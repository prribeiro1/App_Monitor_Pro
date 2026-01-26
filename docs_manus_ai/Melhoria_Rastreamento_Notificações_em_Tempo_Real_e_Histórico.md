Melhoria: Rastreamento, Notificações em
Tempo Real e Histórico
Este guia contém as implementações necessárias para que o link de acompanhamento dos
pais exiba notificações e para que o sistema grave um histórico detalhado de cada evento
da rota.
1. Notificações em Tempo Real no Link dos Pais
Para que o pai veja alertas no mapa sem precisar de um app instalado, vamos usar o canal
de Broadcast do Supabase que você já tem.
No arquivo pages/PublicTrackingPage.tsx :
Adicione este estado e lógica para exibir os alertas que chegarem do motorista.
TypeScript
// Adicione este estado no início do componente
const [notification, setNotification] = useState<{message: string, type: 'info'
// Dentro do useEffect que assina o canal (channelRef):
channel.on('broadcast', { event: 'notification' }, (payload) => {
setNotification({ message: payload.payload.message, type: payload.payload.ty
// Remove a notificação após 10 segundos
setTimeout(() => setNotification(null), 10000);
});
// No JSX (HTML), adicione este alerta flutuante sobre o mapa:
{notification && (
<div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3
notification.type === 'success' ? 'bg-green-600 border-green-400' : 'bg
} text-white font-bold flex items-center gap-2`}>
<span>{notification.type === 'success' ? '✅' : '🚐'}</span>
{notification.message}
</div>
)}
2. Alerta de 500m e Histórico no App do Condutor
No arquivo pages/RouteNavigationScreen.tsx , vamos automatizar a detecção de proximidade e
a gravação do histórico.
Lógica de Proximidade e Histórico:
Adicione esta lógica dentro do seu watchPosition ou em um useEffect que monitore a
userLocation .
TypeScript
// Conjunto para evitar notificações repetidas para o mesmo aluno na mesma rota
const [notifiedStudents] = useState(new Set<string>());
useEffect(() => {
if (!userLocation || points.length === 0) return;
const currentPoint = points[currentPointIndex];
const distance = calculateDistance(userLocation.lat, userLocation.lng, curre
// 1. Alerta de 500 metros
if (distance <= 500 && !notifiedStudents.has(currentPoint.id)) {
notifiedStudents.add(currentPoint.id);
// Envia para o link dos pais em tempo real
driverTracking.broadcastEvent('notification', {
message: `A van está chegando! (aprox. 500m)`,
type: 'info'
});
// Alerta sonoro/vibração para o condutor (se estiver no celular)
if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
// Opcional: Mostrar um aviso na tela do condutor com botão para WhatsAp
// (Você pode usar um Toast ou Alert aqui)
}
}, [userLocation]);
// 2. Gravação de Histórico ao marcar como Visitado (Embarque/Desembarque)
const handleMarkAsVisitedWithHistory = async () => {
const point = points[currentPointIndex];
// Grava no banco de dados (Histórico)
await dbService.saveRouteEvent({
id: crypto.randomUUID(),
sessionId: currentRouteSessionId, // ID da rota atual iniciada
studentId: point.studentData[0]?.id, // Pega o primeiro aluno do ponto
eventType: 'arrival',
timestamp: Date.now(),
latitude: userLocation?.lat,
longitude: userLocation?.lng,
notes: `Chegada em: ${point.name}`
});
// Notifica os pais no link em tempo real
driverTracking.broadcastEvent('notification', {
message: `Embarque/Desembarque confirmado!`,
type: 'success'
});
handleMarkAsVisited(); // Chama sua função original
};
3. Atualização no services/driverTracking.ts
Adicione esta função para facilitar o envio de eventos personalizados:
TypeScript
/**
* Envia um evento personalizado para todos os pais que estão assistindo
*/
async broadcastEvent(event: string, payload: any): Promise<void> {
if (!this.channel) return;
try {
await this.channel.send({
type: 'broadcast',
event: event,
payload: payload
});
} catch (e) {
console.error('[Tracking] Erro ao transmitir evento:', e);
}
}
4. O que isso muda no seu App?
1. Experiência do Pai: Ele não precisa mais ficar "viciado" olhando o mapa. O celular dele
vai apitar ou mostrar o balão de aviso quando a van estiver perto.
2. Segurança Jurídica: Com o histórico de route_events , se um pai disser que a van não
passou, o condutor tem a prova com data, hora e localização GPS exata de onde ele
marcou a visita.
3. Valor de Venda: Você agora pode dizer aos seus clientes que o Monitor Pro tem um
"Sistema de Notificações Inteligentes" e "Auditoria de Rotas".
Dica para o Histórico:
Certifique-se de que, ao clicar em "Iniciar Rota", você crie um route_session_id único. Isso
servirá para agrupar todos os eventos daquela viagem específica.