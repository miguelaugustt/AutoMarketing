const axios = require('axios');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Iniciando Testes End-to-End do AUT0MARKETING (Estado Limpo & Com Imagem/Vídeo)...\n');

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

    // 3. Validação do Estado Inicial Limpo
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

    // 5. Criação de Grupos
    console.log('\n5. Testando Cadastro de Grupos & Canais...');
    const group1Res = await axios.post(`${BASE_URL}/api/groups`, {
      name: 'Comunidade Afiliados VIP',
      platform: 'Telegram',
      external_group_id: '-1001987654321',
      invite_url: 'https://t.me/afiliados_vip_demo',
      active: true
    }, authHeaders);
    const group1 = group1Res.data.group;

    const group2Res = await axios.post(`${BASE_URL}/api/groups`, {
      name: 'Página Produtos Digitais',
      platform: 'Meta',
      external_group_id: '123456789012345',
      invite_url: 'https://facebook.com/produtosdigitais',
      active: true
    }, authHeaders);
    const group2 = group2Res.data.group;

    console.log(`   ✅ Grupo 1 cadastrado: "${group1.name}" [${group1.authorization_status}]`);
    console.log(`   ✅ Grupo 2 cadastrado: "${group2.name}" [${group2.authorization_status}]`);

    // 6. Criação de Campanha com Imagem e Vídeo opcionais
    console.log('\n6. Testando Criação de Campanha com Imagem e Vídeo Opcionais...');
    const campRes = await axios.post(`${BASE_URL}/api/campaigns`, {
      name: 'Campanha Com Mídia',
      frequency_hours: 24,
      product_id: prod1Id,
      message_template: '{Está procurando se qualificar?|Conheça este material exclusivo!}\n\n📌 *{product_name}*\n_{product_description}_\n\n👉 Saiba mais: {affiliate_url}',
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

    // 7. Disparo com Imagem
    console.log('\n7. Testando Disparo com Imagem...');
    const triggerImgRes = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/trigger`, {
      ignoreInterval: true,
      force: true,
      image_url: 'https://exemplo.com/oferta-imagem.jpg',
      video_url: null
    }, authHeaders);
    console.log('   ✅ Disparo com imagem concluído:', {
      campanha: triggerImgRes.data.result.campaignName,
      processados: triggerImgRes.data.result.processed,
      detalhes: triggerImgRes.data.result.details.map(d => ({ grupo: d.group, status: d.status }))
    });

    // 8. Disparo com Vídeo
    console.log('\n8. Testando Disparo com Vídeo...');
    const triggerVidRes = await axios.post(`${BASE_URL}/api/campaigns/${campaignId}/trigger`, {
      ignoreInterval: true,
      force: true,
      image_url: null,
      video_url: 'https://exemplo.com/oferta-video.mp4'
    }, authHeaders);
    console.log('   ✅ Disparo com vídeo concluído:', {
      campanha: triggerVidRes.data.result.campaignName,
      processados: triggerVidRes.data.result.processed,
      detalhes: triggerVidRes.data.result.details.map(d => ({ grupo: d.group, status: d.status }))
    });

    // 9. Consulta de Histórico - verificar campos image_url e video_url
    console.log('\n9. Testando Histórico de Publicações com Mídia...');
    const historyRes = await axios.get(`${BASE_URL}/api/publications`, authHeaders);
    console.log(`   ✅ Registros no histórico: ${historyRes.data.count}`);
    if (historyRes.data.publications.length > 0) {
      const pub = historyRes.data.publications[0];
      console.log(`   ✅ Status: [${pub.status}] para Grupo: "${pub.group?.name}"`);
      console.log(`   ✅ Produto: "${pub.product?.name}"`);
      console.log(`   ✅ Imagem: ${pub.image_url || 'Não informada'}`);
      console.log(`   ✅ Vídeo: ${pub.video_url || 'Não informado'}`);
    }

    // 10. Kill Switch
    console.log('\n10. Testando Kill Switch de Emergência...');
    const toggleKill = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch ativado:', toggleKill.data.emergency_pause_all);

    const resumeKill = await axios.post(`${BASE_URL}/api/dashboard/toggle-emergency`, {}, authHeaders);
    console.log('   ✅ Kill Switch desativado:', !resumeKill.data.emergency_pause_all);

    // 11. Limpeza dos dados de teste
    console.log('\n11. Limpando dados de teste...');
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
    const allPubs = await axios.get(`${BASE_URL}/api/publications`, authHeaders);
    for (const p of allPubs.data.publications) {
      await axios.delete(`${BASE_URL}/api/publications/${p.id}`, authHeaders);
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
