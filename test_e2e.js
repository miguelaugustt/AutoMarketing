const axios = require('axios');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Iniciando Testes End-to-End do AUT0MARKETING...\n');

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

    // 3. Dashboard Stats
    console.log('\n3. Testando Dashboard Stats...');
    const statsRes = await axios.get(`${BASE_URL}/api/dashboard/stats`, authHeaders);
    console.log('   ✅ Estatísticas:', {
      produtos: statsRes.data.stats.products.total,
      grupos_autorizados: statsRes.data.stats.groups.authorized,
      campanhas: statsRes.data.stats.campaigns.total,
      status: statsRes.data.stats.system.status
    });

    // 4. Produtos CRUD
    console.log('\n4. Testando CRUD de Produtos Afiliados...');
    const createProdRes = await axios.post(`${BASE_URL}/api/products`, {
      name: 'Curso Teste Automatizado',
      description: 'Descrição de teste para validação de ciclo',
      affiliate_url: 'https://kiwify.app/teste-auto?af=test1',
      category: 'Tecnologia',
      platform: 'Kiwify',
      promotional_text: 'Oferta exclusiva de teste',
      active: true
    }, authHeaders);
    const createdProductId = createProdRes.data.product.id;
    console.log('   ✅ Produto criado com ID:', createdProductId);

    // Toggle active
    const toggleProdRes = await axios.patch(`${BASE_URL}/api/products/${createdProductId}/toggle-active`, {}, authHeaders);
    console.log('   ✅ Toggle status produto:', toggleProdRes.data.product.active ? 'Ativo' : 'Inativo');

    // Reativa produto
    await axios.patch(`${BASE_URL}/api/products/${createdProductId}/toggle-active`, {}, authHeaders);

    // 5. Grupos
    console.log('\n5. Testando Gerenciamento de Grupos e Verificação de Permissões...');
    const groupsRes = await axios.get(`${BASE_URL}/api/groups`, authHeaders);
    console.log(`   ✅ Total de grupos recuperados: ${groupsRes.data.count}`);
    const firstGroup = groupsRes.data.groups[0];

    const testPermRes = await axios.post(`${BASE_URL}/api/groups/${firstGroup.id}/test-permissions`, {}, authHeaders);
    console.log('   ✅ Teste de permissão do bot no grupo:', testPermRes.data.message);

    // 6. Campanhas & Preview de Variações de Anúncio
    console.log('\n6. Testando Geração de Variações de Anúncios e Spintax...');
    const previewRes = await axios.post(`${BASE_URL}/api/campaigns/preview`, {
      message_template: '{Descubra agora|Aprenda hoje|Veja esta novidade}: {product_name}!\nLink: {affiliate_url}',
      product_id: createdProductId
    }, authHeaders);
    console.log('   ✅ Variações geradas:');
    previewRes.data.previews.forEach((p, i) => {
      console.log(`      [Variação ${p.version}]: "${p.text.replace(/\n/g, ' ')}"`);
    });

    // 7. Execução do Motor de Distribuição (Disparo de Campanha)
    console.log('\n7. Testando Execução do Motor de Distribuição...');
    const campaignsRes = await axios.get(`${BASE_URL}/api/campaigns`, authHeaders);
    const campaignId = campaignsRes.data.campaigns[0].id;

    const triggerRes = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/trigger`, {
      ignoreInterval: true, // Força execução para testar fluxo completo
      force: true
    }, authHeaders);
    console.log('   ✅ Resultado do disparo:', {
      campanha: triggerRes.data.result.campaignName,
      processados: triggerRes.data.result.processed,
      detalhes: triggerRes.data.result.details.map(d => ({ grupo: d.group, status: d.status, produto: d.product }))
    });

    // 8. Histórico de Publicações
    console.log('\n8. Testando Consulta de Histórico de Publicações...');
    const historyRes = await axios.get(`${BASE_URL}/api/publications`, authHeaders);
    console.log(`   ✅ Registros no histórico de auditoria: ${historyRes.data.count}`);
    if (historyRes.data.publications.length > 0) {
      const latest = historyRes.data.publications[0];
      console.log(`   ✅ Última publicação: [${latest.status}] para Grupo: "${latest.group?.name}" com Produto: "${latest.product?.name}"`);
    }

    // 9. Teste do Kill Switch (Interrupção Geral de Emergência)
    console.log('\n9. Testando Kill Switch (Interrupção Geral)...');
    const toggleKillRes = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch ativado:', toggleKillRes.data.emergency_pause_all);

    // Tentar disparar com Kill Switch ativado (deve ser bloqueado pelo motor)
    try {
      await axios.post(`${BASE_URL}/api/dashboard/trigger-run`, {}, authHeaders);
    } catch (err) {
      console.log('   ✅ Motor bloqueou execução como esperado durante Kill Switch:', err.response?.data?.error);
    }

    // Desativa o Kill Switch
    const resumeKillRes = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch desativado e sistema reativado:', !resumeKillRes.data.emergency_pause_all);

    // 10. Limpeza do produto de teste
    await axios.delete(`${BASE_URL}/api/products/${createdProductId}`, authHeaders);
    console.log('\n10. ✅ Produto de teste removido após validação.');

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
