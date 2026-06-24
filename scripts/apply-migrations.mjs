import mysql from 'mysql2/promise';
import fs from 'fs';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Get already applied migrations
  const [rows] = await connection.execute('SELECT hash FROM __drizzle_migrations');
  const appliedHashes = new Set(rows.map(r => r.hash));
  
  const migrations = [
    { file: 'drizzle/0051_left_shape.sql', tag: '0051_left_shape' },
    { file: 'drizzle/0052_flashy_spirit.sql', tag: '0052_flashy_spirit' },
  ];
  
  for (const mig of migrations) {
    const sql = fs.readFileSync(mig.file, 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    
    if (appliedHashes.has(hash)) {
      console.log(`[SKIP] ${mig.tag} already applied`);
      continue;
    }
    
    console.log(`[APPLY] ${mig.tag}...`);
    
    // Split by statement-breakpoint
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    
    let errors = 0;
    for (const stmt of statements) {
      try {
        await connection.execute(stmt);
        process.stdout.write('.');
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
          process.stdout.write('s');
        } else {
          console.error(`\n  ERROR: ${err.message}`);
          errors++;
        }
      }
    }
    console.log('');
    
    // Record migration as applied
    const now = Date.now();
    await connection.execute(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      [hash, now]
    );
    console.log(`  Recorded ${mig.tag} (${errors} errors)`);
  }
  
  await connection.end();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
