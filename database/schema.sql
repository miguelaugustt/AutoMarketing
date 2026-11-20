-- ==============================================================================
-- AUT0MARKETING - Supabase PostgreSQL Schema
-- Versão: 1.0
-- Descrição: Estrutura de tabelas, relacionamentos, índices e dados iniciais
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
-- DADOS INICIAIS (SEEDS)
-- ------------------------------------------------------------------------------

-- Configurações padrão
INSERT INTO settings (setting_name, setting_value) VALUES
('emergency_pause_all', 'false'),
('default_frequency_hours', '24'),
('simulation_mode', 'false'),
('telegram_bot_token', ''),
('admin_password_hash', '$2a$10$wE1M2m0OaP7O0h1YqM7MyeR6C97d6/oZ7E5q2Q2s9h0pZkFwQ4oKi') -- default: admin123
ON CONFLICT (setting_name) DO NOTHING;

-- Produtos de demonstração Kiwify & plataformas de afiliados
INSERT INTO products (id, name, description, affiliate_url, category, platform, promotional_text, active) VALUES
('11111111-1111-1111-1111-111111111111', 'Curso Mestres da Renda Extra', 'Treinamento completo sobre modelos comprovados de prestação de serviços digitais e renda complementar.', 'https://kiwify.app/renda-extra-demo?af=auto1', 'Educação Financeira', 'Kiwify', 'Aprenda métodos práticos e éticos para construir uma renda complementar sem sair de casa.', TRUE),
('22222222-2222-2222-2222-222222222222', 'Guia Produtividade Máxima', 'E-book e templates Notion com metodologia de organização pessoal e gestão de tempo.', 'https://kiwify.app/produtividade-demo?af=auto2', 'Desenvolvimento Pessoal', 'Kiwify', 'Transforme sua rotina com um sistema testado de foco, priorização e organização diária.', TRUE),
('33333333-3333-3333-3333-333333333333', 'Academia do Tráfego Pago', 'Aulas diretas ao ponto sobre anúncios em Meta Ads e Google Ads para prestadores de serviço.', 'https://kiwify.app/trafego-pago-demo?af=auto3', 'Marketing Digital', 'Kiwify', 'Domine as ferramentas oficiais de anúncios e atraia clientes qualificados com previsibilidade.', TRUE),
('44444444-4444-4444-4444-444444444444', 'Manual do Copywriting Ético', 'Modelos e estruturas de comunicação persuasiva e autêntica para vendas online.', 'https://kiwify.app/copywriting-demo?af=auto4', 'Vendas e Copywriting', 'Kiwify', 'Aprenda a comunicar o valor real do seu produto com clareza e autoridade.', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Grupos de exemplo com diferentes estados de autorização
INSERT INTO groups (id, name, invite_url, platform, external_group_id, authorization_status, advertising_permission, automation_permission, active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Comunidade Empreendedores Digitais VIP', 'https://t.me/empreendedores_demo', 'Telegram', '-1001987654321', 'authorized', TRUE, TRUE, TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clube de Afiliados e Networking', 'https://t.me/afiliados_networking_demo', 'Telegram', '-1001876543210', 'authorized', TRUE, TRUE, TRUE),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Grupo Estudos de Marketing (Moderação Estrita)', 'https://t.me/marketing_estudos_demo', 'Telegram', '-1001765432109', 'pending', FALSE, FALSE, TRUE),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Fórum Geral de Negócios (Sem Divulgação)', 'https://t.me/negocios_geral_demo', 'Telegram', '-1001654321098', 'unauthorized', FALSE, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Campanhas de demonstração
INSERT INTO campaigns (id, name, product_id, message_template, frequency_hours, status) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Campanha Rotação Inteligente de Afiliados', NULL, '{Está procurando uma maneira prática de se qualificar?|Quer conhecer novas oportunidades de aprendizado?|Se você busca materiais relevantes para sua carreira, confira:}

📌 *{product_name}*
_{product_description}_

💡 *Destaque:* {promotional_text}
👉 Saiba mais no link oficial: {affiliate_url}

#aprendizado #oportunidade #desenvolvimento', 24, 'active')
ON CONFLICT (id) DO NOTHING;
