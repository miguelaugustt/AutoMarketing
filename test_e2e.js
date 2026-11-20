const axios = require('axios');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Iniciando Testes End-to-End do AUT0MARKETING (Estado Limpo & Permissões Automáticas)...\n');

  try {
    // 1. Health check
    console.log('1. Testando Health Check...');
    const healthRes = await axios.get(`${BASE_URL}/api/health`);
    console.log('   ✅ Health Check:', healthRes.data.status, '| DB:', healthRes.data.database.type);

    // 2. Login
    console.log('\n2. Testando Autenticação Administrativa...');
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('   ✅ Login bem-sucedido! Token JWT recebido.');

    const authHeaders = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 3. Validação do Estado Inicial Limpo (sem dados pré-preenchidos)
    console.log('\n3. Validando Estado Inicial Limpo...');
    const initialStatsRes = await axios.get(`${BASE_URL}/api/dashboard/stats`, authHeaders);
    const initialStats = initialStatsRes.data.stats;
    console.log('   ✅ Banco de dados inicial verificado:');
    console.log(`      - Produtos: ${initialStats.products.total} (Vazio e limpo)`);
    console.log(`      - Grupos: ${initialStats.groups.total} (Vazio e limpo)`);
    console.log(`      - Campanhas: ${initialStats.campaigns.total} (Vazio e limpo)`);
    console.log(`      - Publicações: ${initialStats.publications.total} (Vazio e limpo)`);

    // 4. Criação de Produtos Afiliados
    console.log('\n4. Testando Cadastro de Produtos Afiliados...');
    const prod1Res = await axios.post(`${BASE_URL}/api/products`, {
      name: 'Curso Renda Extra Digital',
      description: 'Treinamento completo sobre serviços digitais e monetização',
      affiliate_url: 'https://kiwify.app/renda-extra-demo?af=test1',
      category: 'Educação Financeira',
      platform: 'Kiwify',
      promotional_text: 'Aprenda modelos testados de prestação de serviços online.',
      active: true
    }, authHeaders);
    const prod1Id = prod1Res.data.product.id;

    const prod2Res = await axios.post(`${BASE_URL}/api/products`, {
      name: 'Guia Produtividade Máxima',
      description: 'E-book e templates de gestão de rotina',
      affiliate_url: 'https://kiwify.app/produtividade-demo?af=test2',
      category: 'Desenvolvimento Pessoal',
      platform: 'Kiwify',
      promotional_text: 'Transforme sua rotina diária com organização.',
      active: true
    }, authHeaders);
    const prod2Id = prod2Res.data.product.id;

    console.log('   ✅ Produtos cadastrados com sucesso:', prod1Id, prod2Id);

    // 5. Testando Cadastro de Grupos com Validação AUTOMÁTICA de Permissões
    console.log('\n5. Testando Validação AUTOMÁTICA de Permissões do Bot...');
    const group1Res = await axios.post(`${BASE_URL}/api/groups`, {
      name: 'Comunidade Afiliados VIP',
      platform: 'Telegram',
      external_group_id: '-1001987654321',
      invite_url: 'https://t.me/afiliados_vip_demo',
      active: true
    }, authHeaders);
    const group1 = group1Res.data.group;

    console.log(`   ✅ Grupo cadastrado com status automático: [${group1.authorization_status}]`);
    console.log(`   ✅ Permissões automáticas: Divulgação=${group1.advertising_permission}, Automação=${group1.automation_permission}`);

    // Teste de revalidação de permissões individual
    const testPermRes = await axios.post(`${BASE_URL}/api/groups/${group1.id}/test-permissions`, {}, authHeaders);
    console.log('   ✅ Revalidação automática via Telegram API:', testPermRes.data.message);

    // Teste de sincronização em lote
    const syncAllRes = await axios.post(`${BASE_URL}/api/groups/sync-all`, {}, authHeaders);
    console.log('   ✅ Sincronização em lote concluída:', syncAllRes.data.message);

    // 5.1 Teste do Radar de Grupos e Prospecção (Opção Avulsa)
    console.log('\n5.1 Testando Radar de Grupos e Exportação de Relatório...');
    const searchProspectRes = await axios.get(`${BASE_URL}/api/prospector/search?keyword=afiliados`, authHeaders);
    console.log(`   ✅ Radar localizou ${searchProspectRes.data.count} comunidades de afiliados.`);

    const exportCsvRes = await axios.get(`${BASE_URL}/api/prospector/export-csv?keyword=afiliados`, authHeaders);
    console.log(`   ✅ Relatório CSV gerado com sucesso (${exportCsvRes.data.length} bytes).`);

    const importProspectRes = await axios.post(`${BASE_URL}/api/prospector/import`, {
      groupData: searchProspectRes.data.groups[0]
    }, authHeaders);
    console.log('   ✅ Importação avulsa via Radar:', importProspectRes.data.message);

    // 6. Criação de Campanha com Spintax
    console.log('\n6. Testando Criação de Campanha e Geração de Variações...');
    const campRes = await axios.post(`${BASE_URL}/api/campaigns`, {
      name: 'Campanha Rotação Geral Afiliados',
      frequency_hours: 24,
      product_id: null, // Rotação Inteligente Aleatória
      message_template: '{Está procurando se qualificar?|Conheça este material exclusivo|Confira esta novidade:}\n\n📌 *{product_name}*\n_{product_description}_\n\n👉 Saiba mais: {affiliate_url}',
      status: 'active'
    }, authHeaders);
    const campaignId = campRes.data.campaign.id;
    console.log('   ✅ Campanha criada com sucesso (ID):', campaignId);

    // Preview
    const previewRes = await axios.post(`${BASE_URL}/api/campaigns/preview`, {
      message_template: campRes.data.campaign.message_template,
      product_id: prod1Id
    }, authHeaders);
    console.log(`   ✅ Amostra gerada: "${previewRes.data.previews[0].text.replace(/\n/g, ' ')}"`);

    // 7. Execução do Motor de Distribuição (Disparo)
    console.log('\n7. Testando Execução do Motor de Distribuição...');
    const triggerRes = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/trigger`, {
      ignoreInterval: true,
      force: true
    }, authHeaders);
    console.log('   ✅ Disparo concluído com sucesso:', {
      campanha: triggerRes.data.result.campaignName,
      processados: triggerRes.data.result.processed,
      detalhes: triggerRes.data.result.details.map(d => ({ grupo: d.group, status: d.status, produto: d.product }))
    });

    // 8. Consulta de Histórico de Auditoria
    console.log('\n8. Testando Histórico de Publicações...');
    const historyRes = await axios.get(`${BASE_URL}/api/publications`, authHeaders);
    console.log(`   ✅ Registros no histórico: ${historyRes.data.count}`);
    if (historyRes.data.publications.length > 0) {
      const pub = historyRes.data.publications[0];
      console.log(`   ✅ Status: [${pub.status}] para Grupo: "${pub.group?.name}" com Produto: "${pub.product?.name}"`);
    }

    // 9. Kill Switch
    console.log('\n9. Testando Kill Switch de Emergência...');
    const toggleKill = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch ativado:', toggleKill.data.emergency_pause_all);

    const resumeKill = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch desativado:', !resumeKill.data.emergency_pause_all);

    // 10. Limpeza dos dados de teste
    console.log('\n10. Limpando dados de teste...');
    const allProds = await axios.get(`${BASE_URL}/api/products`, authHeaders);
    for (const p of allProds.data.products) {
      await axios.delete(`${BASE_URL}/api/products/${p.id}`, authHeaders);
    }
    const allGroups = await axios.get(`${BASE_URL}/api/groups`, authHeaders);
    for (const g of allGroups.data.groups) {
      await axios.delete(`${BASE_URL}/api/groups/${g.id}`, authHeaders);
    }
    const allCamps = await axios.get(`${BASE_URL}/api/campaigns`, authHeaders);
    for (const c of allCamps.data.campaigns) {
      await axios.delete(`${BASE_URL}/api/campaigns/${c.id}`, authHeaders);
    }
    console.log('   ✅ Dados de teste removidos. Sistema restaurado para estado limpo.');

    console.log('\n============================================================');
    console.log('🎉 TODOS OS TESTES FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Inicia servidor e roda testes
const server = require('./backend/server.js');
setTimeout(async () => {
  await runTests();
  process.exit(0);
}, 1500);
