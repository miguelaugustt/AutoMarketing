-- ==============================================================================
-- AUT0MARKETING - Supabase PostgreSQL Schema
-- Versão: 1.0 (Limpo / Pronto para Uso)
-- Descrição: Estrutura de tabelas, relacionamentos e índices
-- ==============================================================================

-- Habilita extensão para UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABELA: products (Produtos Afiliados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    affiliate_url TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    platform VARCHAR(100) NOT NULL DEFAULT 'Kiwify',
    promotional_text TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ------------------------------------------------------------------------------
-- 2. TABELA: groups (Grupos e Comunidades)
-- ------------------------------------------------------------------------------
-- Estados de autorização válidos:
-- 'pending', 'authorized', 'unauthorized', 'blocked', 'unavailable'
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    invite_url TEXT,
    platform VARCHAR(50) NOT NULL DEFAULT 'Telegram',
    external_group_id VARCHAR(100), -- Ex: -100123456789 no Telegram
    authorization_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    advertising_permission BOOLEAN NOT NULL DEFAULT FALSE,
    automation_permission BOOLEAN NOT NULL DEFAULT FALSE,
    last_publication_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ------------------------------------------------------------------------------
-- 3. TABELA: campaigns (Campanhas de Divulgação)
-- ------------------------------------------------------------------------------
-- Se product_id for NULL, o motor utiliza o modo de seleção aleatória entre produtos ativos
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    message_template TEXT NOT NULL,
    frequency_hours INTEGER NOT NULL DEFAULT 24,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, paused, completed
    start_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: publications (Histórico e Fila de Publicações)
-- ------------------------------------------------------------------------------
-- Status possíveis:
-- 'scheduled', 'processing', 'published', 'failed', 'canceled', 'blocked_unauthorized'
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ------------------------------------------------------------------------------
-- 5. TABELA: settings (Configurações Gerais do Sistema)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ------------------------------------------------------------------------------
-- ÍNDICES PARA PERFORMANCE E CONSULTAS DO MOTOR
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_groups_auth ON groups(authorization_status, active, advertising_permission, automation_permission);
CREATE INDEX IF NOT EXISTS idx_groups_last_pub ON groups(last_publication_at);
CREATE INDEX IF NOT EXISTS idx_publications_group ON publications(group_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ------------------------------------------------------------------------------
-- CONFIGURAÇÕES PADRÃO INICIAIS (Apenas Parâmetros do Sistema)
-- ------------------------------------------------------------------------------
INSERT INTO settings (setting_name, setting_value) VALUES
('emergency_pause_all', 'false'),
('default_frequency_hours', '24'),
('simulation_mode', 'false'),
('telegram_bot_token', ''),
('admin_password_hash', '$2a$10$eE0U4Z1J9h7D7FvK9pMGeerW1e3N9n4a7q1W2e3R4t5Y6u7I8o9Pa') -- admin123
ON CONFLICT (setting_name) DO NOTHING;
