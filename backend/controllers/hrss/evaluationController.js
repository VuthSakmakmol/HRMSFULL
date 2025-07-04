const Evaluation = require('../../models/hrss/evaluation');


exports.createEvaluation = async (req, res) => {
  try {
    const { employeeId, step, date, reason, evaluator } = req.body;
    const evaluation = await Evaluation.create({ employeeId, step, date, reason, evaluator });
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('❌ createEvaluation error:', error);
    res.status(500).json({ error: 'Failed to create evaluation' });
  }
};

exports.getEvaluationsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const evaluations = await Evaluation.find({ employeeId }).sort({ step: 1 });
    res.json(evaluations);
  } catch (error) {
    console.error('❌ getEvaluationsByEmployee error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
};


exports.updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Evaluation.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('❌ updateEvaluation error:', error);
    res.status(500).json({ error: 'Failed to update evaluation' });
  }
};

exports.deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluation.findByIdAndDelete(id);
    res.json({ message: 'Evaluation deleted' });
  } catch (error) {
    console.error('❌ deleteEvaluation error:', error);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
};
