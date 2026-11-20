const groupProspectorService = require('../services/groupProspector.service');

class ProspectorController {
  async search(req, res, next) {
    try {
      const { keyword, category } = req.query;
      const results = await groupProspectorService.searchGroups(keyword, category);

      return res.json({
        success: true,
        count: results.length,
        keyword: keyword || '',
        category: category || '',
        groups: results
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const { keyword, category } = req.query;
      const groups = await groupProspectorService.searchGroups(keyword, category);
      const csvData = groupProspectorService.generateCsvReport(groups);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `relatorio_grupos_afiliados_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvData);
    } catch (error) {
      next(error);
    }
  }

  async import(req, res, next) {
    try {
      const { groupData } = req.body;
      if (!groupData || !groupData.name || !groupData.invite_url) {
        return res.status(400).json({
          success: false,
          error: 'Dados incompletos para importação do grupo.'
        });
      }

      const result = await groupProspectorService.importToUserGroups(groupData);
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProspectorController();
