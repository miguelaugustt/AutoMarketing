const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Caminho para armazenamento local de contingência/desenvolvimento
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'local_db.json');

// Estado inicial limpo (sem produtos, grupos, campanhas ou histórico pré-preenchidos)
const INITIAL_DB_STATE = {
  products: [],
  groups: [],
  campaigns: [],
  publications: [],
  settings: {
    emergency_pause_all: 'false',
    default_frequency_hours: '24',
    simulation_mode: 'false',
    telegram_bot_token: '',
    admin_password_hash: '$2a$10$eE0U4Z1J9h7D7FvK9pMGeerW1e3N9n4a7q1W2e3R4t5Y6u7I8o9Pa' // admin123
  }
};

class Database {
  constructor() {
    this.isSupabaseEnabled = false;
    this.supabase = null;
    this.init();
  }

  init() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('sua-url-supabase') && !supabaseKey.includes('sua-chave')) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isSupabaseEnabled = true;
        console.log('[Database] Conectado ao Supabase com sucesso:', supabaseUrl);
      } catch (err) {
        console.error('[Database] Falha ao conectar ao Supabase, alternando para armazenamento local:', err.message);
        this.isSupabaseEnabled = false;
      }
    } else {
      console.log('[Database] Modo de armazenamento local ativo.');
      this.isSupabaseEnabled = false;
      this.ensureLocalDb();
    }
  }

  ensureLocalDb() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(INITIAL_DB_STATE, null, 2), 'utf-8');
      console.log('[Database] Banco local limpo inicializado em:', LOCAL_DB_PATH);
    }
  }

  readLocalDb() {
    this.ensureLocalDb();
    try {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('[Database] Erro ao ler local_db.json:', err.message);
      return INITIAL_DB_STATE;
    }
  }

  writeLocalDb(data) {
    this.ensureLocalDb();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  getConnectionInfo() {
    return {
      type: this.isSupabaseEnabled ? 'supabase' : 'local',
      connected: true,
      url: this.isSupabaseEnabled ? process.env.SUPABASE_URL : 'local_db.json',
      path: LOCAL_DB_PATH
    };
  }

  // ==========================================
  // PRODUTOS (products)
  // ==========================================
  async getProducts(filters = {}) {
    if (this.isSupabaseEnabled) {
      let query = this.supabase.from('products').select('*').order('created_at', { ascending: false });
      if (filters.activeOnly) query = query.eq('active', true);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.platform) query = query.eq('platform', filters.platform);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const db = this.readLocalDb();
      let list = [...(db.products || [])];
      if (filters.activeOnly) list = list.filter(p => p.active === true);
      if (filters.category) list = list.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
      if (filters.platform) list = list.filter(p => p.platform.toLowerCase() === filters.platform.toLowerCase());
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
      }
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  async getProductById(id) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('products').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    } else {
      const db = this.readLocalDb();
      return db.products.find(p => p.id === id) || null;
    }
  }

  async createProduct(productData) {
    const newProduct = {
      id: productData.id || crypto.randomUUID(),
      name: productData.name,
      description: productData.description || '',
      affiliate_url: productData.affiliate_url,
      category: productData.category || 'Geral',
      platform: productData.platform || 'Kiwify',
      promotional_text: productData.promotional_text || '',
      active: productData.active !== undefined ? Boolean(productData.active) : true,
      created_at: new Date().toISOString()
    };

    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('products').insert([newProduct]).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      db.products.unshift(newProduct);
      this.writeLocalDb(db);
      return newProduct;
    }
  }

  async updateProduct(id, updates) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      const index = db.products.findIndex(p => p.id === id);
      if (index === -1) return null;
      db.products[index] = { ...db.products[index], ...updates };
      this.writeLocalDb(db);
      return db.products[index];
    }
  }

  async deleteProduct(id) {
    if (this.isSupabaseEnabled) {
      const { error } = await this.supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const db = this.readLocalDb();
      db.products = db.products.filter(p => p.id !== id);
      this.writeLocalDb(db);
      return true;
    }
  }

  // ==========================================
  // GRUPOS (groups)
  // ==========================================
  async getGroups(filters = {}) {
    if (this.isSupabaseEnabled) {
      let query = this.supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (filters.authorizedOnly) {
        query = query
          .eq('authorization_status', 'authorized')
          .eq('advertising_permission', true)
          .eq('automation_permission', true)
          .eq('active', true);
      }
      if (filters.platform) query = query.eq('platform', filters.platform);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const db = this.readLocalDb();
      let list = [...(db.groups || [])];
      if (filters.authorizedOnly) {
        list = list.filter(g =>
          g.authorization_status === 'authorized' &&
          g.advertising_permission === true &&
          g.automation_permission === true &&
          g.active === true
        );
      }
      if (filters.platform) {
        list = list.filter(g => g.platform.toLowerCase() === filters.platform.toLowerCase());
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(g => g.name.toLowerCase().includes(s) || (g.external_group_id && g.external_group_id.includes(s)));
      }
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  async getGroupById(id) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('groups').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    } else {
      const db = this.readLocalDb();
      return db.groups.find(g => g.id === id) || null;
    }
  }

  async createGroup(groupData) {
    const newGroup = {
      id: groupData.id || crypto.randomUUID(),
      name: groupData.name,
      invite_url: groupData.invite_url || '',
      platform: groupData.platform || 'Telegram',
      external_group_id: groupData.external_group_id || '',
      authorization_status: groupData.authorization_status || 'pending',
      advertising_permission: Boolean(groupData.advertising_permission),
      automation_permission: Boolean(groupData.automation_permission),
      last_publication_at: null,
      active: groupData.active !== undefined ? Boolean(groupData.active) : true,
      created_at: new Date().toISOString()
    };

    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('groups').insert([newGroup]).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      db.groups.unshift(newGroup);
      this.writeLocalDb(db);
      return newGroup;
    }
  }

  async updateGroup(id, updates) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('groups').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      const index = db.groups.findIndex(g => g.id === id);
      if (index === -1) return null;
      db.groups[index] = { ...db.groups[index], ...updates };
      this.writeLocalDb(db);
      return db.groups[index];
    }
  }

  async deleteGroup(id) {
    if (this.isSupabaseEnabled) {
      const { error } = await this.supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const db = this.readLocalDb();
      db.groups = db.groups.filter(g => g.id !== id);
      this.writeLocalDb(db);
      return true;
    }
  }

  async updateGroupLastPublication(id, timestamp = new Date().toISOString()) {
    return this.updateGroup(id, { last_publication_at: timestamp });
  }

  // ==========================================
  // CAMPANHAS (campaigns)
  // ==========================================
  async getCampaigns(filters = {}) {
    if (this.isSupabaseEnabled) {
      let query = this.supabase.from('campaigns').select('*, product:products(*)').order('created_at', { ascending: false });
      if (filters.status) query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const db = this.readLocalDb();
      let list = [...(db.campaigns || [])];
      if (filters.status) list = list.filter(c => c.status === filters.status);
      return list.map(c => {
        const prod = c.product_id ? db.products.find(p => p.id === c.product_id) : null;
        return { ...c, product: prod };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  async getCampaignById(id) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('campaigns').select('*, product:products(*)').eq('id', id).single();
      if (error) return null;
      return data;
    } else {
      const db = this.readLocalDb();
      const camp = db.campaigns.find(c => c.id === id);
      if (!camp) return null;
      const prod = camp.product_id ? db.products.find(p => p.id === camp.product_id) : null;
      return { ...camp, product: prod };
    }
  }

  async createCampaign(campaignData) {
    const newCampaign = {
      id: campaignData.id || crypto.randomUUID(),
      name: campaignData.name,
      product_id: campaignData.product_id || null,
      message_template: campaignData.message_template,
      frequency_hours: parseInt(campaignData.frequency_hours, 10) || 24,
      status: campaignData.status || 'active',
      start_at: campaignData.start_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('campaigns').insert([newCampaign]).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      db.campaigns.unshift(newCampaign);
      this.writeLocalDb(db);
      return newCampaign;
    }
  }

  async updateCampaign(id, updates) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('campaigns').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      const index = db.campaigns.findIndex(c => c.id === id);
      if (index === -1) return null;
      db.campaigns[index] = { ...db.campaigns[index], ...updates };
      this.writeLocalDb(db);
      return db.campaigns[index];
    }
  }

  async deleteCampaign(id) {
    if (this.isSupabaseEnabled) {
      const { error } = await this.supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const db = this.readLocalDb();
      db.campaigns = db.campaigns.filter(c => c.id !== id);
      this.writeLocalDb(db);
      return true;
    }
  }

  // ==========================================
  // PUBLICAÇÕES E HISTÓRICO (publications)
  // ==========================================
  async getPublications(filters = {}) {
    if (this.isSupabaseEnabled) {
      let query = this.supabase
        .from('publications')
        .select('*, product:products(name, platform, affiliate_url), group:groups(name, platform, external_group_id), campaign:campaigns(name)')
        .order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.groupId) query = query.eq('group_id', filters.groupId);
      if (filters.productId) query = query.eq('product_id', filters.productId);
      if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
      if (filters.limit) query = query.limit(parseInt(filters.limit, 10));

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } else {
      const db = this.readLocalDb();
      let list = [...(db.publications || [])];

      if (filters.status) list = list.filter(p => p.status === filters.status);
      if (filters.groupId) list = list.filter(p => p.group_id === filters.groupId);
      if (filters.productId) list = list.filter(p => p.product_id === filters.productId);
      if (filters.campaignId) list = list.filter(p => p.campaign_id === filters.campaignId);

      const populated = list.map(pub => {
        const prod = db.products.find(p => p.id === pub.product_id);
        const grp = db.groups.find(g => g.id === pub.group_id);
        const camp = db.campaigns.find(c => c.id === pub.campaign_id);
        return {
          ...pub,
          product: prod ? { name: prod.name, platform: prod.platform, affiliate_url: prod.affiliate_url } : null,
          group: grp ? { name: grp.name, platform: grp.platform, external_group_id: grp.external_group_id } : null,
          campaign: camp ? { name: camp.name } : null
        };
      });

      populated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (filters.limit) {
        return populated.slice(0, parseInt(filters.limit, 10));
      }
      return populated;
    }
  }

  async getRecentPublicationsForGroup(groupId, limit = 5) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase
        .from('publications')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) return [];
      return data || [];
    } else {
      const db = this.readLocalDb();
      return (db.publications || [])
        .filter(p => p.group_id === groupId && p.status === 'published')
        .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
        .slice(0, limit);
    }
  }

  async createPublication(pubData) {
    const newPub = {
      id: pubData.id || crypto.randomUUID(),
      campaign_id: pubData.campaign_id || null,
      product_id: pubData.product_id,
      group_id: pubData.group_id,
      message: pubData.message,
      status: pubData.status || 'scheduled',
      scheduled_at: pubData.scheduled_at || new Date().toISOString(),
      published_at: pubData.published_at || null,
      error_message: pubData.error_message || null,
      created_at: new Date().toISOString()
    };

    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('publications').insert([newPub]).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      db.publications.unshift(newPub);
      this.writeLocalDb(db);
      return newPub;
    }
  }

  async updatePublication(id, updates) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('publications').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      const index = db.publications.findIndex(p => p.id === id);
      if (index === -1) return null;
      db.publications[index] = { ...db.publications[index], ...updates };
      this.writeLocalDb(db);
      return db.publications[index];
    }
  }

  // ==========================================
  // CONFIGURAÇÕES (settings)
  // ==========================================
  async getSettings() {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('settings').select('*');
      if (error) throw error;
      const settingsMap = {};
      (data || []).forEach(item => {
        settingsMap[item.setting_name] = item.setting_value;
      });
      return settingsMap;
    } else {
      const db = this.readLocalDb();
      return db.settings || {};
    }
  }

  async getSetting(name, defaultValue = null) {
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase.from('settings').select('setting_value').eq('setting_name', name).single();
      if (error || !data) return defaultValue;
      return data.setting_value;
    } else {
      const db = this.readLocalDb();
      return db.settings && db.settings[name] !== undefined ? db.settings[name] : defaultValue;
    }
  }

  async setSetting(name, value) {
    const stringVal = String(value);
    if (this.isSupabaseEnabled) {
      const { data, error } = await this.supabase
        .from('settings')
        .upsert({ setting_name: name, setting_value: stringVal, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = this.readLocalDb();
      if (!db.settings) db.settings = {};
      db.settings[name] = stringVal;
      this.writeLocalDb(db);
      return { setting_name: name, setting_value: stringVal };
    }
  }

  // ==========================================
  // ESTATÍSTICAS E DASHBOARD
  // ==========================================
  async getDashboardStats() {
    const products = await this.getProducts();
    const groups = await this.getGroups();
    const campaigns = await this.getCampaigns();
    const publications = await this.getPublications();
    const settings = await this.getSettings();

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.active).length;

    const totalGroups = groups.length;
    const authorizedGroups = groups.filter(g =>
      g.authorization_status === 'authorized' &&
      g.advertising_permission &&
      g.automation_permission &&
      g.active
    ).length;

    const pendingGroups = groups.filter(g => g.authorization_status === 'pending').length;
    const unauthorizedGroups = groups.filter(g => g.authorization_status === 'unauthorized' || g.authorization_status === 'blocked').length;

    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    const totalPublished = publications.filter(p => p.status === 'published').length;
    const totalScheduled = publications.filter(p => p.status === 'scheduled').length;
    const totalFailed = publications.filter(p => p.status === 'failed').length;
    const totalBlocked = publications.filter(p => p.status === 'blocked_unauthorized').length;

    const isEmergencyPaused = settings.emergency_pause_all === 'true';
    const isSimulationMode = settings.simulation_mode === 'true';

    return {
      products: { total: totalProducts, active: activeProducts },
      groups: { total: totalGroups, authorized: authorizedGroups, pending: pendingGroups, unauthorized: unauthorizedGroups },
      campaigns: { total: campaigns.length, active: activeCampaigns },
      publications: {
        total: publications.length,
        published: totalPublished,
        scheduled: totalScheduled,
        failed: totalFailed,
        blocked: totalBlocked
      },
      system: {
        emergency_pause_all: isEmergencyPaused,
        simulation_mode: isSimulationMode,
        database_type: this.isSupabaseEnabled ? 'Supabase (PostgreSQL)' : 'Armazenamento Local',
        status: isEmergencyPaused ? 'PAUSADO (Interrupção Geral)' : 'OPERACIONAL'
      }
    };
  }
}

module.exports = new Database();
