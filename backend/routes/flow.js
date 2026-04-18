/**
 * routes/flow.js
 * GET /api/flow?wallet=ADDRESS
 * Returns Sankey-ready flow data: nodes + flows with aggregated XLM amounts.
 */

const express = require('express');
const router  = express.Router();
const { fetchPayments } = require('../services/horizon');
const { isValidAddress } = require('../services/stellarPayment');

router.get('/', async (req, res) => {
  const { wallet, limit = '60' } = req.query;

  if (!wallet || !isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid Stellar wallet address' });
  }

  try {
    const payments = await fetchPayments(wallet, parseInt(limit, 10));
    const ops = payments.filter(
      (p) => (p.type === 'payment' || p.type === 'create_account') && p.amount
    );

    // Aggregate flows: key = "from||to", value = total XLM
    const flowMap = {};
    const addrSet = new Set();

    ops.forEach((p) => {
      const from = p.from || p.funder || wallet;
      const to   = p.to   || p.account || wallet;
      if (!from || !to || from === to) return;

      addrSet.add(from);
      addrSet.add(to);

      const key = `${from}||${to}`;
      if (!flowMap[key]) flowMap[key] = { from, to, value: 0, count: 0 };
      flowMap[key].value += parseFloat(p.amount || 0);
      flowMap[key].count += 1;
    });

    const shorten = (a) => `${a.slice(0, 5)}...${a.slice(-4)}`;

    // Build node list — wallet is always index 0
    const addrArr = [wallet, ...Array.from(addrSet).filter((a) => a !== wallet)];
    const nodes   = addrArr.map((addr) => ({
      id:       addr,
      label:    shorten(addr),
      isTarget: addr === wallet,
    }));

    // Build flow list with node indices
    const flows = Object.values(flowMap).map((f) => ({
      source:      addrArr.indexOf(f.from),
      target:      addrArr.indexOf(f.to),
      sourceAddr:  f.from,
      targetAddr:  f.to,
      value:       parseFloat(f.value.toFixed(7)),
      count:       f.count,
    })).filter((f) => f.source !== -1 && f.target !== -1);

    // Top senders / receivers for summary
    const inflow  = ops.filter((p) => (p.to || p.account) === wallet)
                       .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const outflow = ops.filter((p) => p.from === wallet)
                       .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    return res.json({
      wallet,
      nodes,
      flows,
      summary: {
        total_ops:  ops.length,
        inflow:     parseFloat(inflow.toFixed(7)),
        outflow:    parseFloat(outflow.toFixed(7)),
        net:        parseFloat((inflow - outflow).toFixed(7)),
        unique_counterparties: addrSet.size - 1,
      },
    });
  } catch (err) {
    console.error('[flow error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
