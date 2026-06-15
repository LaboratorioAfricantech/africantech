/**
 * js/main.js
 * MOTOR DE SEGURANÇA, NAVEGAÇÃO E INTERFACE - AFRICANTECH ERP
 * Versão Estável Final: Sem Sockets / Sem Loops de Atualização
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. BLOQUEIO DE SEGURANÇA IMEDIATO ---
    const token = localStorage.getItem('token');
    const usuarioJson = localStorage.getItem('usuario');

    // Se não houver sessão ativa, expulsa para o login
    if (!token || !usuarioJson) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // --- 2. DESBLOQUEIO CONTROLADO DA INTERFACE ---
        const loadingOverlay = document.getElementById('loading-overlay');
        const appShell = document.getElementById('app-shell');
        
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (appShell) {
            appShell.style.display = 'flex';
            document.body.style.display = 'flex';
        }

        // --- 3. INICIALIZAÇÃO DE DADOS ---
        atualizarHeaderUI();
        aplicarRestricoesPorNivel(); 

        // --- 4. CARREGAMENTO INICIAL ---
        // Carrega notificações apenas uma vez no arranque
        await carregarNotificacoesBanco();

        // --- 5. ENTRADA NO DASHBOARD ---
        navegar('dashboard');

    } catch (err) {
        console.error("Erro crítico na inicialização:", err);
        localStorage.clear();
        window.location.href = 'login.html';
    }
});

/**
 * MOTOR DE NAVEGAÇÃO SPA (Single Page Application)
 * Gere a troca de ecrãs sem recarregar a página
 */
async function navegar(modulo) {
    const main = document.getElementById('main-content');
    const menu = document.getElementById('nav-main-menu');
    
    if (!main) return;

    // A. Verifica sessão antes de cada navegação
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    // B. Fecha o menu mobile
    if (menu) menu.classList.remove('active');

    // C. Proteção de Rotas Admin
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const modulosRestritos = ['provincias', 'usuarios'];
    if (usuario.tipo_acesso !== 'admin' && modulosRestritos.includes(modulo)) {
        main.innerHTML = `
            <div class="primavera-card" style="text-align:center; padding:50px; border-top:4px solid var(--danger);">
                <h2 style="color:var(--danger)">acesso restrito</h2>
                <p>o seu perfil não tem permissão para o módulo: ${modulo}.</p>
                <button class="btn-primary" onclick="navegar('dashboard')">voltar ao dashboard</button>
            </div>`;
        return;
    }

    // D. Feedback visual e troca de conteúdo
    main.innerHTML = `<div class="loading">a processar dados de ${modulo}...</div>`;
    marcarMenuAtivo(modulo);

    try {
        // Pequena pausa para garantir que o DOM está pronto
        await new Promise(r => setTimeout(r, 30));

        switch(modulo) {
            case 'dashboard':  await renderDashboard(); break;
            case 'stock':      await renderStock(); break;
            case 'usuarios':   await renderUsuarios(); break;
            case 'movimentos': await renderMovimentos(); break;
            case 'provincias': await renderProvincias(); break;
            case 'perfil':     await renderPerfil(); break;
            case 'ranking':    await renderRanking(); break;
            case 'projetos':   await renderProjetos(); break;
            default:
                main.innerHTML = `<div class="primavera-card">módulo não encontrado.</div>`;
        }
    } catch (error) {
        console.error(`Erro ao carregar ${modulo}:`, error);
        main.innerHTML = `<div class="primavera-card" style="color:var(--danger)">erro técnico ao renderizar o ecrã.</div>`;
    }
}

/**
 * LÓGICA DE NOTIFICAÇÕES (BLINDADA CONTRA REFRESH)
 */
function toggleNotificacoes(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const panel = document.getElementById('notif-panel');
    if (!panel) return;

    const abrir = panel.style.display !== 'block';
    panel.style.display = abrir ? 'block' : 'none';
    
    if (abrir) carregarNotificacoesBanco();
}

async function carregarNotificacoesBanco() {
    const badge = document.getElementById('notif-count');
    const list = document.getElementById('notif-list');
    
    if (!badge || !list) return;

    const res = await api.request('/notificacoes');
    if (!res || res.status === 401) return; 

    if (res.sucesso && res.dados) {
        const naoLidas = res.dados.filter(n => !n.lida).length;
        badge.innerText = naoLidas;
        badge.style.display = naoLidas > 0 ? 'block' : 'none';

        if (res.dados.length === 0) {
            list.innerHTML = `<p style="padding:15px; font-size:11px; color:#999; text-align:center;">sem notificações.</p>`;
        } else {
            list.innerHTML = res.dados.map(n => `
                <div class="notif-item" onclick="marcarNotificacaoLida(${n.id}, event)" 
                     style="${!n.lida ? 'border-left: 3px solid var(--accent); background:#f9f9f9;' : ''}">
                    <strong>${n.titulo.toLowerCase()}</strong>
                    <p>${n.mensagem.toLowerCase()}</p>
                    <small>${new Date(n.criado_at).toLocaleString()}</small>
                </div>
            `).join('');
        }
    }
}

async function marcarNotificacaoLida(id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation(); 
    }
    const res = await api.request(`/notificacoes/lida/${id}`, 'PATCH');
    if (res && res.sucesso) carregarNotificacoesBanco();
}

/**
 * UI: ATUALIZA O CABEÇALHO
 */
function atualizarHeaderUI() {
    const usuarioJson = localStorage.getItem('usuario');
    if (!usuarioJson) return;

    const usuario = JSON.parse(usuarioJson);
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const initialsEl = document.getElementById('nav-avatar-initials');
    const photoImg = document.getElementById('nav-user-photo');

    if (nameEl) nameEl.innerText = (usuario.nome || "utilizador").toLowerCase();
    if (roleEl) roleEl.innerText = (usuario.tipo_acesso || "acesso").toLowerCase();
    
    if (usuario.foto_url && photoImg) {
        photoImg.src = usuario.foto_url;
        photoImg.style.display = 'block';
        if (initialsEl) initialsEl.style.display = 'none';
    } else if (initialsEl) {
        initialsEl.innerText = usuario.nome ? usuario.nome.substring(0, 2).toUpperCase() : "AT";
        initialsEl.style.display = 'block';
        if (photoImg) photoImg.style.display = 'none';
    }
}

function marcarMenuAtivo(modulo) {
    document.querySelectorAll('.menu-items button').forEach(btn => {
        btn.classList.remove('active-nav');
        if (btn.id === `btn-${modulo}`) btn.classList.add('active-nav');
    });
    
    const perfil = document.getElementById('nav-perfil-block');
    if (perfil) {
        if (modulo === 'perfil') perfil.classList.add('active-nav');
        else perfil.classList.remove('active-nav');
    }
}

function aplicarRestricoesPorNivel() {
    const uJson = localStorage.getItem('usuario');
    if (!uJson) return;
    const u = JSON.parse(uJson);
    if (u.tipo_acesso !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

/**
 * LOGOUT E CONFIRMAÇÕES
 */
function fecharSessao() {
    exibirConfirmacao("encerrar sessão", "deseja realmente sair?", () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

function exibirConfirmacao(titulo, mensagem, callback) {
    const modal = document.getElementById('modal-confirmacao');
    if (!modal) { if(confirm(mensagem)) callback(); return; }
    
    document.getElementById('confirm-titulo').innerText = titulo;
    document.getElementById('confirm-mensagem').innerText = mensagem;
    modal.style.display = 'flex';

    const btnOk = document.getElementById('confirm-btn-ok');
    const newBtnOk = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);

    newBtnOk.onclick = () => { modal.style.display = 'none'; callback(); };
    document.getElementById('confirm-btn-cancelar').onclick = () => { modal.style.display = 'none'; };
}

// Fechar painéis ao clicar fora
window.onclick = function(event) {
    const modalConfirm = document.getElementById('modal-confirmacao');
    const notifPanel = document.getElementById('notif-panel');
    
    if (event.target == modalConfirm) modalConfirm.style.display = "none";
    
    if (notifPanel && notifPanel.style.display === 'block') {
        if (!event.target.closest('.notif-container')) {
            notifPanel.style.display = "none";
        }
    }
}