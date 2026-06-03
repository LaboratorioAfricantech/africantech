// js/modules/ranking.js

async function renderRanking() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="module-header">
            <h2>ranking de utilização de materiais</h2>
            <button class="btn-primavera" onclick="renderStock()">← voltar ao stock</button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <!-- TOP SAÍDAS (Mais Usados) -->
            <div class="primavera-card">
                <h3 style="color:var(--danger)">↑ materiais mais usados (saídas)</h3>
                <div id="ranking-saida-list"></div>
            </div>

            <!-- TOP ENTRADAS (Mais Comprados) -->
            <div class="primavera-card">
                <h3 style="color:var(--success)">↓ materiais mais repostos (entradas)</h3>
                <div id="ranking-entrada-list"></div>
            </div>
        </div>
    `;

    const res = await api.request('/historico'); // Puxa os movimentos de movimentos_stock
    if (res.sucesso) {
        processarRankings(res.dados);
    }
}

function processarRankings(movimentos) {
    const counts = { ENTRADA: {}, SAIDA: {} };

    movimentos.forEach(m => {
        const key = m.material_nome;
        counts[m.tipo][key] = (counts[m.tipo][key] || 0) + parseFloat(m.quantidade);
    });

    const sortE = Object.entries(counts.ENTRADA).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const sortS = Object.entries(counts.SAIDA).sort((a,b) => b[1] - a[1]).slice(0, 10);

    document.getElementById('ranking-entrada-list').innerHTML = renderLista(sortE, 'green');
    document.getElementById('ranking-saida-list').innerHTML = renderLista(sortS, 'red');
}

function renderLista(data, cor) {
    return data.map(([nome, qtd], index) => `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <span style="font-weight:bold; width:20px;">${index+1}º</span>
            <div style="flex:1">${nome.toLowerCase()}</div>
            <div style="font-weight:bold; color:${cor}">${qtd} unidades</div>
        </div>
    `).join('');
}