# 📋 ESPECIFICAÇÃO: Nova Estrutura de Rotas e Roteirização

**Data:** 25/01/2026  
**Branch:** feature/feedback-condutores  
**Status:** Em Planejamento

---

## 🎯 OBJETIVO

Simplificar a estrutura de rotas e adicionar funcionalidades de roteirização inteligente com avisos automáticos para pais.

---

## 📊 ESTRUTURA ATUAL vs NOVA

### ❌ ESTRUTURA ATUAL (3 níveis)
```
Rota
  └─ Ponto (Stop)
      └─ Aluno (Student)
```

**Problemas:**
- Muito rígido
- Condutores não usam "pontos fixos"
- Difícil reorganizar ordem

### ✅ ESTRUTURA NOVA (2 níveis)
```
Rota
  └─ Aluno (Student)
      ├─ Endereço (opcional)
      ├─ Ordem na rota
      └─ Status (ativo/faltante)
```

**Vantagens:**
- Mais flexível
- Fácil reorganizar
- Fácil "pular" faltantes

---

## 🗄️ MUDANÇAS NO BANCO DE DADOS

### 1. Tabela `students` (Modificar)

**Campos NOVOS:**
```typescript
interface Student {
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  routeId: string;              // ID da rota (antes era stopId)
  address?: string;             // Endereço completo (opcional)
  latitude?: number;            // Coordenadas (opcional)
  longitude?: number;           // Coordenadas (opcional)
  routeOrder: number;           // Ordem na rota (1, 2, 3...)
  estimatedPickupTime?: string; // Horário estimado de embarque
  estimatedDropTime?: string;   // Horário estimado de desembarque
}
```

**Campos REMOVIDOS:**
```typescript
stopId: string; // ❌ Não precisa mais
```

### 2. Tabela `stops` (Depreciar)

**Ação:** Manter por compatibilidade, mas não usar mais.

**Migração:** Converter stops existentes em alunos com endereços.

### 3. Tabela `route_sessions` (NOVA)

Para controlar cada "viagem" da rota:

```typescript
interface RouteSession {
  id: string;
  routeId: string;
  date: string;                 // Data da viagem
  type: 'pickup' | 'dropoff';   // Ida ou volta
  startTime?: string;           // Horário de início
  endTime?: string;             // Horário de término
  skippedStudents: string[];    // IDs dos alunos que faltaram
  status: 'planned' | 'in_progress' | 'completed';
}
```

### 4. Tabela `route_events` (NOVA)

Para histórico detalhado:

```typescript
interface RouteEvent {
  id: string;
  sessionId: string;
  studentId: string;
  eventType: 'notification_sent' | 'picked_up' | 'dropped_off' | 'skipped';
  timestamp: string;
  location?: { lat: number; lng: number };
  notes?: string;
}
```

### 5. Tabela `parent_access` (NOVA)

Para app dos pais:

```typescript
interface ParentAccess {
  id: string;
  studentId: string;
  accessCode: string;           // Código único para os pais
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  notificationsEnabled: boolean;
  createdAt: string;
}
```

---

## 🎨 MUDANÇAS NA INTERFACE

### 1. Tela de Cadastro de Alunos (StudentsScreen)

**ADICIONAR:**
- Campo "Rota" (dropdown com rotas existentes)
- Campo "Endereço" (opcional)
  - Input manual
  - Botão "Usar localização atual" (GPS)
- Campo "Ordem na rota" (número)
- Botão "Gerar código para pais"

**REMOVER:**
- Campo "Ponto" (não existe mais)

### 2. Tela de Rotas (RoutesScreen)

**ADICIONAR:**
- Botão "Organizar Rota" (abre tela de roteirização)
- Indicador de quantos alunos na rota
- Botão "Iniciar Rota" (abre tela de seleção de faltantes)

**MANTER:**
- Lista de rotas
- Criar/Editar/Deletar rotas

### 3. NOVA TELA: Organizar Rota (RouteOrganizerScreen)

**Funcionalidades:**
- Lista de alunos da rota (drag & drop para reordenar)
- Botão "Otimizar por endereço" (algoritmo automático)
- Botão "Salvar ordem"
- Preview do mapa com marcadores numerados

**Layout:**
```
┌─────────────────────────────────────┐
│ Rota: Russier-Varelinha             │
│ ─────────────────────────────────── │
│ [Otimizar Automaticamente]          │
│                                     │
│ 1. ☰ João Silva                     │
│    📍 Rua A, 123                    │
│    🕐 08:00 (estimado)              │
│                                     │
│ 2. ☰ Maria Santos                   │
│    📍 Rua B, 456                    │
│    🕐 08:05 (estimado)              │
│                                     │
│ 3. ☰ Pedro Costa                    │
│    📍 Rua C, 789                    │
│    🕐 08:10 (estimado)              │
│                                     │
│ [Salvar Ordem]                      │
└─────────────────────────────────────┘
```

### 4. NOVA TELA: Selecionar Faltantes (RouteStartScreen)

**Funcionalidades:**
- Lista de alunos da rota
- Checkbox para marcar faltantes
- Botão "Iniciar Rota"

**Layout:**
```
┌─────────────────────────────────────┐
│ Quem vai hoje?                      │
│ ─────────────────────────────────── │
│ ☑ João Silva                        │
│ ☑ Maria Santos                      │
│ ☐ Pedro Costa (faltou)              │
│ ☑ Ana Lima                          │
│                                     │
│ [Iniciar Rota] (3 alunos)           │
└─────────────────────────────────────┘
```

### 5. NOVA TELA: Navegação da Rota (RouteNavigationScreen - Melhorada)

**Funcionalidades:**
- Mapa com marcadores numerados
- Lista de alunos na ordem (sem os faltantes)
- Botão "Avisar que estou chegando" (envia notificação)
- Botão "Embarque confirmado" / "Desembarque confirmado"
- Progresso visual (1/5, 2/5, etc.)
- Histórico de eventos

**Layout:**
```
┌─────────────────────────────────────┐
│ [Mapa com marcadores 1, 2, 3...]    │
│                                     │
│ Progresso: 2/5 alunos               │
│ ─────────────────────────────────── │
│ ✅ 1. João Silva (embarcou 08:02)   │
│ ➡️ 2. Maria Santos (próximo)        │
│    [Avisar que estou chegando]      │
│    [Confirmar embarque]             │
│ ⏸️ 3. Ana Lima                       │
│ ⏸️ 4. Carlos Souza                   │
│                                     │
│ [Finalizar Rota]                    │
└─────────────────────────────────────┘
```

### 6. NOVO APP: App dos Pais (ParentTrackingApp)

**Funcionalidades:**
- Login com código de acesso
- Mapa em tempo real (localização do condutor)
- Status do filho ("A caminho", "Embarcou", "Na escola")
- Notificações push
- Histórico de viagens

**Layout:**
```
┌─────────────────────────────────────┐
│ Monitor Pro - Acompanhamento        │
│ ─────────────────────────────────── │
│ Aluno: João Silva                   │
│ Status: 🚐 A caminho                │
│                                     │
│ [Mapa com localização do condutor]  │
│                                     │
│ Próximo: Embarque em ~5 min         │
│                                     │
│ Histórico de hoje:                  │
│ 08:00 - Condutor iniciou rota       │
│ 08:02 - Aviso: Chegando em breve    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 FLUXO COMPLETO

### Fluxo 1: Cadastrar Aluno

1. Condutor vai em "Alunos"
2. Clica em "Adicionar Aluno"
3. Preenche dados básicos
4. **NOVO:** Seleciona a rota (ou deixa em branco)
5. **NOVO:** Adiciona endereço (opcional)
6. **NOVO:** Define ordem na rota (ou deixa automático)
7. Salva

### Fluxo 2: Organizar Rota

1. Condutor vai em "Rotas"
2. Seleciona uma rota
3. Clica em "Organizar Rota"
4. **Opção A:** Clica em "Otimizar Automaticamente" (algoritmo)
5. **Opção B:** Arrasta alunos para reordenar manualmente
6. Salva ordem

### Fluxo 3: Iniciar Rota

1. Condutor vai em "Rotas"
2. Seleciona uma rota
3. Clica em "Iniciar Rota"
4. **NOVO:** Marca quem está faltando
5. Clica em "Iniciar"
6. Abre tela de navegação

### Fluxo 4: Durante a Rota

1. Condutor vê mapa com próximo aluno
2. Quando está chegando, clica em "Avisar que estou chegando"
   - **NOVO:** Sistema envia notificação para os pais
3. Quando o aluno embarca, clica em "Confirmar embarque"
   - **NOVO:** Sistema registra horário e localização
4. Repete para próximo aluno
5. Ao final, clica em "Finalizar Rota"
   - **NOVO:** Sistema salva histórico completo

### Fluxo 5: Pais Acompanhando

1. Pais recebem código de acesso do condutor
2. Abrem app dos pais
3. Digitam código
4. Veem mapa em tempo real
5. Recebem notificações:
   - "Condutor iniciou a rota"
   - "Chegando em 5 minutos"
   - "Seu filho embarcou"
   - "Seu filho chegou na escola"

---

## 🧮 ALGORITMO DE OTIMIZAÇÃO

### Entrada:
- Lista de alunos com coordenadas
- Ponto de partida (localização do condutor)

### Algoritmo: Vizinho Mais Próximo (Nearest Neighbor)

```typescript
function optimizeRoute(students: Student[], startLocation: {lat, lng}): Student[] {
  const optimized: Student[] = [];
  const remaining = [...students];
  let current = startLocation;
  
  while (remaining.length > 0) {
    // Encontra aluno mais próximo
    let nearest = remaining[0];
    let minDistance = calculateDistance(current, nearest);
    
    for (const student of remaining) {
      const distance = calculateDistance(current, student);
      if (distance < minDistance) {
        nearest = student;
        minDistance = distance;
      }
    }
    
    // Adiciona à rota otimizada
    optimized.push(nearest);
    current = { lat: nearest.latitude!, lng: nearest.longitude! };
    
    // Remove da lista
    remaining.splice(remaining.indexOf(nearest), 1);
  }
  
  return optimized;
}
```

---

## 📱 SISTEMA DE NOTIFICAÇÕES

### Para os Pais:

**Canais:**
1. Push Notification (app dos pais)
2. SMS (opcional, se configurado)
3. WhatsApp (opcional, via API)

**Eventos:**
- Rota iniciada
- Chegando em 5 minutos
- Filho embarcou
- Filho desembarcou na escola

### Implementação:

**Opção 1: Firebase Cloud Messaging (FCM)**
- Gratuito
- Suporta push notifications
- Fácil integração

**Opção 2: OneSignal**
- Gratuito até 10k usuários
- Mais fácil que FCM
- Dashboard completo

---

## 🗂️ MIGRAÇÃO DE DADOS

### Estratégia:

1. **Manter compatibilidade:** Não deletar tabela `stops`
2. **Migração automática:** Converter stops em endereços de alunos
3. **Fallback:** Se aluno não tem endereço, usar nome do stop antigo

### Script de Migração:

```sql
-- Adicionar novos campos na tabela students
ALTER TABLE students ADD COLUMN route_id TEXT;
ALTER TABLE students ADD COLUMN address TEXT;
ALTER TABLE students ADD COLUMN route_order INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN estimated_drop_time TEXT;

-- Migrar dados: pegar routeId do stop
UPDATE students s
SET route_id = (
  SELECT st.route_id 
  FROM stops st 
  WHERE st.id = s.stop_id
);

-- Migrar dados: usar nome do stop como endereço temporário
UPDATE students s
SET address = (
  SELECT st.name 
  FROM stops st 
  WHERE st.id = s.stop_id
);

-- Criar novas tabelas
CREATE TABLE route_sessions (...);
CREATE TABLE route_events (...);
CREATE TABLE parent_access (...);
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Banco de Dados
- [ ] Criar migration para novos campos em `students`
- [ ] Criar tabela `route_sessions`
- [ ] Criar tabela `route_events`
- [ ] Criar tabela `parent_access`
- [ ] Executar script de migração de dados

### Fase 2: Backend/Services
- [ ] Atualizar `types.ts` com novas interfaces
- [ ] Criar `routeOptimizationService.ts`
- [ ] Criar `notificationService.ts`
- [ ] Atualizar `dbService.ts` com novas funções

### Fase 3: Telas do Condutor
- [ ] Atualizar `StudentsScreen.tsx` (adicionar campos)
- [ ] Criar `RouteOrganizerScreen.tsx`
- [ ] Criar `RouteStartScreen.tsx`
- [ ] Atualizar `RouteNavigationScreen.tsx` (adicionar avisos)
- [ ] Atualizar `RoutesScreen.tsx` (novos botões)

### Fase 4: App dos Pais
- [ ] Criar projeto separado ou PWA
- [ ] Tela de login com código
- [ ] Tela de rastreamento em tempo real
- [ ] Sistema de notificações
- [ ] Histórico de viagens

### Fase 5: Testes
- [ ] Testar otimização de rota
- [ ] Testar avisos automáticos
- [ ] Testar app dos pais
- [ ] Testar migração de dados antigos

---

## 🎯 PRIORIDADES

### MVP (Mínimo Viável):
1. ✅ Estrutura nova (Rota → Alunos)
2. ✅ Campo de endereço no aluno
3. ✅ Tela de organizar rota (manual)
4. ✅ Tela de selecionar faltantes
5. ✅ Navegação melhorada

### Fase 2:
6. ✅ Otimização automática
7. ✅ Previsão de horários
8. ✅ Histórico de eventos

### Fase 3:
9. ✅ App dos pais
10. ✅ Sistema de notificações

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidade:** Manter estrutura antiga funcionando durante transição
2. **Performance:** Otimização de rota deve ser rápida (< 1 segundo)
3. **Offline:** App deve funcionar sem internet (sync depois)
4. **Privacidade:** Código dos pais deve ser único e seguro

---

**Próximo Passo:** Revisar esta especificação e aprovar para começar implementação.

**Última Atualização:** 25/01/2026 - 16:30
