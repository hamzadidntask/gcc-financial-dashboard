import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'gcc_financial_data.json'), 'utf-8'));

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('Clearing existing data...');
  await connection.execute('DELETE FROM chatHistory');
  await connection.execute('DELETE FROM pivotData');
  await connection.execute('DELETE FROM plVariance');
  await connection.execute('DELETE FROM stores');

  // Batch insert stores
  console.log('Seeding stores...');
  const storeValues = data.pl_summary
    .filter(s => s.store_name)
    .map(s => [
      s.store_name, s.opening_date, s.age, s.sales, s.budget, s.cogs,
      s.gross_profit, s.gross_profit_pct, s.staff_cost, s.staff_cost_pct || null,
      s.marketing_exp, s.marketing_exp_pct, s.rent, s.rent_pct,
      s.royalty, s.royalty_pct, s.other_opex, s.other_opex_pct,
      s.operating_profit, s.operating_profit_pct, s.depreciation, s.amortization,
      s.others, s.np_before_overhead, s.overhead, s.net_profit, s.net_profit_pct
    ]);

  const storePlaceholder = storeValues.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  await connection.execute(
    `INSERT INTO stores (storeName, openingDate, age, sales, budget, cogs, grossProfit, grossProfitPct, staffCost, staffCostPct, marketingExp, marketingExpPct, rent, rentPct, royalty, royaltyPct, otherOpex, otherOpexPct, operatingProfit, operatingProfitPct, depreciation, amortization, others, npBeforeOverhead, overhead, netProfit, netProfitPct) VALUES ${storePlaceholder}`,
    storeValues.flat()
  );
  console.log(`Inserted ${storeValues.length} stores`);

  // Batch insert variance data in chunks of 100
  console.log('Seeding PL Variance...');
  const varRows = data.variance_data.filter(v => v.store && v.line_item);
  const chunkSize = 100;
  for (let i = 0; i < varRows.length; i += chunkSize) {
    const chunk = varRows.slice(i, i + chunkSize);
    const vals = chunk.map(v => [
      v.store, v.line_item, v.dec_actual, v.dec_actual_pct,
      v.dec_budget, v.dec_budget_pct, v.dec_lastyear, v.dec_lastyear_pct,
      v.var_budget_amt, v.var_budget_pct, v.var_lastyear_amt, v.var_lastyear_pct,
      v.ytd_actual, v.ytd_actual_pct, v.ytd_budget, v.ytd_budget_pct,
      v.ytd_lastyear, v.ytd_lastyear_pct, v.ytd_var_budget_amt, v.ytd_var_budget_pct,
      v.ytd_var_lastyear_amt, v.ytd_var_lastyear_pct
    ]);
    const ph = vals.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    await connection.execute(
      `INSERT INTO plVariance (store, lineItem, decActual, decActualPct, decBudget, decBudgetPct, decLastyear, decLastyearPct, varBudgetAmt, varBudgetPct, varLastyearAmt, varLastyearPct, ytdActual, ytdActualPct, ytdBudget, ytdBudgetPct, ytdLastyear, ytdLastyearPct, ytdVarBudgetAmt, ytdVarBudgetPct, ytdVarLastyearAmt, ytdVarLastyearPct) VALUES ${ph}`,
      vals.flat()
    );
    console.log(`  Inserted variance chunk ${i}-${i + chunk.length}`);
  }
  console.log(`Inserted ${varRows.length} variance records`);

  // Batch insert pivot data
  console.log('Seeding Pivot data...');
  const pivotRows = data.pivot_totals.filter(p => p.gl_account);
  const pivotVals = pivotRows.map(p => [p.gl_account, p.total, JSON.stringify({})]);
  const pivotPh = pivotVals.map(() => '(?,?,?)').join(',');
  await connection.execute(
    `INSERT INTO pivotData (glAccount, total, costCenterData) VALUES ${pivotPh}`,
    pivotVals.flat()
  );
  console.log(`Inserted ${pivotRows.length} pivot records`);

  await connection.end();
  console.log('Seeding complete!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
