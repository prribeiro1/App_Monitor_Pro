# 🛰️ Pesquisa de Viabilidade: Portal dos Pais (Rastreamento)

## Objetivo
Criar um link web simples (tipo Uber) para que os pais acompanhem a localização da van em tempo real, sem precisar baixar o app.

## Arquitetura Proposta

### 1. Coleta de Dados (No App do Motorista)
- Durante a rota, o app envia as coordenadas (lat, lng) e o `route_id` para uma tabela `van_locations` no Supabase a cada 30 segundos (ou 1 minuto para economizar bateria).
- A tabela deve ter: `id`, `driver_id`, `route_id`, `latitude`, `longitude`, `speed`, `updated_at`.

### 2. Segurança e Acesso
- **Link Único**: Gerar um UUID para cada motorista/rota (Ex: `https://monitorpro.app/track/7b8e...`).
- **Token de Acesso**: Usar um campo `tracking_token` na tabela `profiles` ou `routes`.
- **Validade**: O rastreio só funciona se o motorista estiver com a "Rota Ativa" no app.

### 3. Visualização (Frontend Web)
- Uma página simples em HTML/JS (Vercel ou Supabase Hosting).
- Uso da biblioteca **Leaflet.js** ou **Google Maps API** (grátis até certo limite).
- O mapa centraliza automaticamente na última posição recebida.

### 4. Estimativa de Esforço
- **Backend (Supabase)**: Criar tabela e política de RLS (Fácil).
- **App (Capacitor/React)**: Implementar background tracking (Médio - Requer lidar com permissões de GPS em segundo plano no Android).
- **Portal Web (HTML)**: Criar página de visualização (Fácil).

## Conclusão
É totalmente viável. O maior desafio é o consumo de bateria e a precisão do GPS em segundo plano no Android, mas temos bibliotecas no Capacitor que resolvem isso.
