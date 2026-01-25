# 📝 Mudanças na StudentsScreen

## O Que Vai Mudar

### 1. Form State - Novos Campos
```typescript
// NOVOS campos adicionados:
const [address, setAddress] = useState('');
const [latitude, setLatitude] = useState<number | undefined>();
const [longitude, setLongitude] = useState<number | undefined>();
const [routeOrder, setRouteOrder] = useState('');
const [useNewStructure, setUseNewStructure] = useState(true); // Toggle para nova estrutura
```

### 2. Visualização - Duas Opções
- **Opção A (Nova):** Agrupar por Rota → Alunos (sem pontos)
- **Opção B (Antiga):** Manter Rota → Pontos → Alunos (compatibilidade)

### 3. Formulário - Campos Atualizados
**REMOVER:**
- ❌ Campo "Ponto de Embarque" (quando usar nova estrutura)

**ADICIONAR:**
- ✅ Campo "Endereço" (textarea, opcional)
- ✅ Botão "Usar Localização Atual" (GPS)
- ✅ Campo "Ordem na Rota" (número, opcional)
- ✅ Toggle "Usar Nova Estrutura" (para escolher entre antiga/nova)

### 4. Salvar - Lógica Atualizada
```typescript
const student: Student = {
  // ... campos existentes ...
  
  // NOVA ESTRUTURA
  routeId: useNewStructure ? selectedRouteId : undefined,
  address: useNewStructure ? address : undefined,
  latitude: useNewStructure ? latitude : undefined,
  longitude: useNewStructure ? longitude : undefined,
  routeOrder: useNewStructure ? parseInt(routeOrder) || 0 : undefined,
  
  // ESTRUTURA ANTIGA (compatibilidade)
  stopId: !useNewStructure ? stopId : '',
};
```

## Implementação Simplificada

Por enquanto, vou fazer uma implementação **MÍNIMA** que:
1. ✅ Adiciona os novos campos no formulário
2. ✅ Salva os dados na nova estrutura
3. ✅ Mantém compatibilidade com estrutura antiga
4. ⏳ Visualização continua igual (vamos mudar depois)

Isso permite testar a nova estrutura sem quebrar nada!
