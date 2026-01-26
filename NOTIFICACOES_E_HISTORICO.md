# 📱 Sistema de Notificações e Histórico

**Data:** 25/01/2026  
**Branch:** feature/feedback-condutores  
**Status:** ✅ Implementado

---

## 🎯 Funcionalidades Implementadas

### 1. 📍 Notificações Automáticas por Proximidade

#### Como Funciona:
1. **Monitoramento Contínuo**: Durante a navegação da rota, o sistema monitora a distância entre o condutor e cada aluno
2. **Detecção de Proximidade**: Quando o condutor está a **500 metros** ou menos de um aluno
3. **Notificação Automática**: Sistema registra evento no banco de dados
4. **Atualização em Tempo Real**: Responsável vê notificação instantaneamente na tela de rastreamento

#### Tecnologia:
- **Geolocation API**: Monitora localização do condutor em tempo real
- **Haversine Formula**: Calcula distância precisa entre coordenadas
- **Supabase Realtime**: Envia notificações instantâneas para a tela do responsável

#### Arquivo: `services/proximityMonitorService.ts`

```typescript
// Monitoramento automático a cada atualização de GPS
proximityMonitorService.checkProximity(
  driverLocation,  // Localização atual do condutor
  students,        // Lista de alunos da rota
  sessionId        // ID da sessão atual
);
```

---

### 2. 🔔 Notificações na Tela de Rastreamento

#### Para o Responsável:
- **Acesso**: Link compartilhado pelo condutor (ex: `https://app.com/track/ABC123`)
- **Funcionalidades**:
  - Ver localização do condutor em tempo real
  - Receber notificações automáticas:
    - 🚐 "Condutor chegando em breve!" (a 500m)
    - ✅ "João embarcou" (quando aluno entra)
    - 🏠 "João desembarcou" (quando aluno sai)
  - Histórico de notificações (últimas 5)
  - Status online/offline do condutor

#### Tipos de Notificação:
1. **Proximidade** (Azul): Condutor a 500m
2. **Embarque** (Verde): Aluno entrou no veículo
3. **Desembarque** (Roxo): Aluno saiu do veículo

#### Arquivo: `pages/PublicTrackingPage.tsx`

```typescript
// Subscrição em tempo real aos eventos
supabase
  .channel('route_events')
  .on('postgres_changes', { event: 'INSERT' }, (payload) => {
    // Mostrar notificação na tela
    showNotification(payload.new);
  })
  .subscribe();
```

---

### 3. 📊 Histórico de Rotas para o Condutor

#### Funcionalidades:
- **Lista de Rotas Concluídas**: Todas as rotas finalizadas
- **Filtro por Data**: Buscar rotas de um dia específico
- **Detalhes Completos**:
  - Data e horário de início/fim
  - Duração total da rota
  - Tipo (Ida/Volta)
  - Lista de alunos atendidos
  - Timeline de eventos:
    - Horário de cada notificação
    - Horário de embarque de cada aluno
    - Horário de desembarque de cada aluno
    - Localização GPS de cada evento

#### Arquivo: `pages/RouteHistoryScreen.tsx`

#### Acesso:
- Aba "Rotas" → Botão de relógio (canto superior direito)
- Rota: `/routes/history`

---

## 🔄 Fluxo Completo

### Cenário: Condutor fazendo rota de ida

1. **Condutor inicia rota**:
   - Vai em "Rotas" → Seleciona rota → "Iniciar Rota"
   - Marca alunos presentes/faltantes
   - Clica em "Iniciar Rota"

2. **Sistema cria sessão**:
   - Registra no banco: `route_sessions`
   - Tipo: "pickup" (ida)
   - Status: "in_progress"
   - Lista de faltantes

3. **Condutor navega**:
   - GPS monitora localização continuamente
   - A cada atualização, verifica distância para próximo aluno

4. **Condutor se aproxima (500m)**:
   - Sistema detecta proximidade automaticamente
   - Registra evento: `route_events` (tipo: "notification_sent")
   - Responsável vê banner azul: "🚐 Condutor chegando em breve!"

5. **Condutor chega na casa**:
   - Clica em "Embarcou"
   - Sistema registra evento: `route_events` (tipo: "picked_up")
   - Responsável vê banner verde: "✅ João embarcou"

6. **Condutor chega na escola**:
   - Clica em "Desembarcou"
   - Sistema registra evento: `route_events` (tipo: "dropped_off")
   - Responsável vê banner roxo: "🏠 João desembarcou"

7. **Condutor finaliza rota**:
   - Após último aluno, sessão é finalizada automaticamente
   - Status muda para "completed"
   - Histórico fica disponível em "Histórico de Rotas"

---

## 📊 Estrutura de Dados

### Tabela: `route_sessions`
```sql
CREATE TABLE route_sessions (
  id TEXT PRIMARY KEY,
  route_id TEXT,
  user_id TEXT,
  date TEXT,                    -- Data da rota (YYYY-MM-DD)
  type TEXT,                    -- 'pickup' ou 'dropoff'
  start_time TEXT,              -- Horário de início (ISO)
  end_time TEXT,                -- Horário de fim (ISO)
  skipped_students TEXT[],      -- IDs dos alunos faltantes
  status TEXT                   -- 'planned', 'in_progress', 'completed'
);
```

### Tabela: `route_events`
```sql
CREATE TABLE route_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,              -- FK para route_sessions
  student_id TEXT,              -- FK para students
  user_id TEXT,
  event_type TEXT,              -- 'notification_sent', 'picked_up', 'dropped_off'
  timestamp TEXT,               -- Horário exato do evento (ISO)
  latitude REAL,                -- Localização do evento
  longitude REAL,
  notes TEXT                    -- Observações adicionais
);
```

---

## 🎨 Interface

### Tela de Rastreamento (Responsável)

```
┌─────────────────────────────────────┐
│ 🚐 Monitor PRO        🟢 AO VIVO    │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🚐 Condutor chegando em breve!│  │ ← Notificação
│  │ 19:05                         │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Mapa com localização do condutor] │
│                                     │
├─────────────────────────────────────┤
│ Última atualização: 19:05:32        │
│ Velocidade: 35 km/h                 │
└─────────────────────────────────────┘
```

### Tela de Histórico (Condutor)

```
┌─────────────────────────────────────┐
│ ← Histórico de Rotas                │
├─────────────────────────────────────┤
│ [Filtro de Data: 25/01/2026]        │
├─────────────────────────────────────┤
│                                     │
│ 📍 Rota Russier-Varelinha  🏠 Ida   │
│ 25/01/2026  07:00  45 min           │
│ 👥 5 aluno(s) atendido(s)           │
│                                     │
│ 📍 Rota Russier-Varelinha  🏫 Volta │
│ 25/01/2026  12:00  40 min           │
│ 👥 5 aluno(s) atendido(s)           │
│                                     │
└─────────────────────────────────────┘
```

### Detalhes da Rota (Modal)

```
┌─────────────────────────────────────┐
│ Detalhes da Rota              ✕     │
├─────────────────────────────────────┤
│ 📍 Rota Russier-Varelinha           │
│ Data: 25/01/2026  Tipo: 🏠 Ida      │
│ Início: 07:00  Fim: 07:45           │
│ Duração: 45 min                     │
├─────────────────────────────────────┤
│ 🕐 Timeline de Eventos              │
│                                     │
│ 📢 João Silva                       │
│    Notificação enviada              │
│    07:05                            │
│                                     │
│ ✅ João Silva                       │
│    Embarcou                         │
│    07:08                            │
│    📍 Lat: -23.5505, Lng: -46.6333  │
│                                     │
│ 🏠 João Silva                       │
│    Desembarcou                      │
│    07:45                            │
│    📍 Lat: -23.5600, Lng: -46.6500  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 Como Usar

### Para o Condutor:

1. **Iniciar Rota**:
   - Rotas → Selecionar rota → Iniciar Rota
   - Marcar faltantes → Iniciar

2. **Durante a Rota**:
   - Sistema envia notificações automaticamente a 500m
   - Clicar em "Embarcou" quando aluno entrar
   - Clicar em "Desembarcou" quando aluno sair

3. **Ver Histórico**:
   - Rotas → Botão de relógio (canto superior)
   - Filtrar por data
   - Clicar em rota para ver detalhes

### Para o Responsável:

1. **Acessar Rastreamento**:
   - Abrir link compartilhado pelo condutor
   - Ex: `https://app.com/track/ABC123`

2. **Acompanhar em Tempo Real**:
   - Ver localização do condutor no mapa
   - Receber notificações automáticas
   - Ver histórico de notificações

---

## 🔧 Configuração Necessária

### 1. Supabase Realtime (Já configurado)
- Habilitar Realtime na tabela `route_events`
- Configurar RLS policies

### 2. GPS Permissions (App)
- Permissão de localização em segundo plano
- Já configurado no AndroidManifest.xml

### 3. Tracking Links (Já implementado)
- Tabela `tracking_links` para códigos de compartilhamento
- Geração automática de códigos únicos

---

## 📈 Benefícios

### Para o Condutor:
- ✅ Notificações automáticas (não precisa fazer nada)
- ✅ Histórico completo de todas as rotas
- ✅ Relatórios detalhados com horários e localizações
- ✅ Prova de atendimento (timestamp + GPS)

### Para o Responsável:
- ✅ Não precisa instalar app
- ✅ Funciona em qualquer celular
- ✅ Notificações em tempo real
- ✅ Sabe exatamente quando o condutor está chegando
- ✅ Confirmação de embarque/desembarque

### Para a Empresa:
- ✅ Histórico completo para auditoria
- ✅ Dados de localização e horários
- ✅ Relatórios automáticos
- ✅ Transparência total

---

## 🎯 Próximas Melhorias (Futuro)

1. **Push Notifications**: Notificações mesmo com app fechado
2. **SMS**: Envio de SMS para quem não tem internet
3. **Relatórios em PDF**: Exportar histórico
4. **Estatísticas**: Tempo médio de rota, pontualidade, etc.
5. **App dos Pais**: App nativo com mais funcionalidades

---

**Última Atualização:** 25/01/2026 - 21:00
