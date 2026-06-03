// js/modules/dashboard.js

async function renderDashboard() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="loading">a processar resumo executivo...</div>`;

    const res = await api.request('/dashboard/resumo'); 

    if (!res.sucesso) {
        main.innerHTML = `<div class="primavera-card" style="color:red">erro ao carregar dashboard: ${res.mensagem}</div>`;
        return;
    }

    main.innerHTML = `
        <div class="dash-wrapper">
            <div class="module-header">
                <div>
                    <h2>painel de controlo principal</h2>
                    <p style="font-size:11px; color:var(--text-secondary);">resumo financeiro e operacional de hoje, ${new Date().toLocaleDateString()}</p>
                </div>
                <button class="btn-primavera" onclick="renderDashboard()">🔄 actualizar dados</button>
            </div>

            <!-- CARDS DE ESTATÍSTICAS (KPIs) -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon" style="background: rgba(16, 124, 16, 0.1); color: var(--success);"></div>
                    <div class="kpi-data">
                        <label>valor total em stock</label>
                        <div class="value">${res.valor_total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <small>mt</small></div>
                        <span class="trend up">↑ ${res.crescimento}% este mês</span>
                    </div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-icon" style="background: rgba(0, 90, 158, 0.1); color: var(--primary);"></div>
                    <div class="kpi-data">
                        <label>total de itens (unidades)</label>
                        <div class="value">${res.total_itens.toLocaleString()}</div>
                        <span class="trend">global acumulado</span>
                    </div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-icon" style="background: rgba(164, 38, 44, 0.1); color: var(--danger);"></div>
                    <div class="kpi-data">
                        <label>alertas de ruptura</label>
                        <div class="value" style="color:var(--danger)">03</div>
                        <span class="trend down">necessita atenção</span>
                    </div>
                </div>
            </div>

            <!-- ÁREA DE ACTIVIDADE RECENTE -->
            <div class="primavera-card" style="padding: 0; overflow: hidden;">
                <div style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0; font-size: 14px; color: var(--primary-dark);">recentes movimentações de stock</h3>
                    <span class="badge" style="background: var(--primary); color: white;">últimos 3 registos</span>
                </div>
                
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th width="100">data</th>
                            <th width="120">operação</th>
                            <th>material / item</th>
                            <th>unidade provincial</th>
                            <th>responsável</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${res.movimentos.map(m => `
                            <tr>
                                <td style="color:#666">${new Date(m.data_movimento).toLocaleDateString()}</td>
                                <td>
                                    <span class="badge ${m.tipo === 'ENTRADA' ? 'status-green' : 'status-red'}" style="width: 80px; display: inline-block; text-align: center;">
                                        ${m.tipo.toLowerCase()}
                                    </span>
                                </td>
                                <td>
                                    <strong>${m.item_nome.toLowerCase()}</strong><br>
                                    <small style="color:#999">projecto: ${m.projeto_nome.toLowerCase()}</small>
                                </td>
                                <td> ${m.provincia_nome.toLowerCase()}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div style="width:20px; height:20px; border-radius:50%; background:#eee; font-size:9px; display:flex; align-items:center; justify-content:center;">${m.funcionario_nome.charAt(0)}</div>
                                        ${m.funcionario_nome.toLowerCase()}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="padding: 15px; text-align: center; background: #fafafa;">
                    <button class="btn-primavera" style="border:none; color: var(--primary); font-weight: bold;" onclick="navegar('movimentos')">ver histórico completo →</button>
                </div>
            </div>
        </div>
    `;
}