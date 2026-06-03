/**
 * js/main.js
 * MOTOR DE SEGURANÇA, NAVEGAÇÃO E UI - AFRICANTECH ERP
 */

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuarioJson = localStorage.getItem('usuario');

    // 1. Se não houver login, manda para o login imediatamente
    if (!token || !usuarioJson) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Se houver login, limpa a tela de loading e mostra o sistema
    const loadingOverlay = document.getElementById('loading-overlay');
    const appShell = document.getElementById('app-shell');
    
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';

    // 3. Inicializar a UI
    atualizarHeaderUI();
    
    // CORREÇÃO AQUI: O nome da função estava diferente da definição abaixo
    aplicarRestricoesPorNivel(); 

    // 4. Forçar a primeira renderização
    navegar('dashboard');
});

/**
 * ACTUALIZA DADOS DO UTILIZADOR NO TOPO (NOME, FUNÇÃO E AVATAR)
 */
function atualizarHeaderUI() {
    const usuarioJson = localStorage.getItem('usuario');
    if (!usuarioJson) return;

    try {
        const usuario = JSON.parse(usuarioJson);

        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const initialsEl = document.getElementById('nav-avatar-initials');
        const photoImg = document.getElementById('nav-user-photo');

        // Actualiza o texto (com fallback para evitar erro se nome for nulo)
        if (nameEl) nameEl.innerText = (usuario.nome || "usuário").toLowerCase();
        if (roleEl) roleEl.innerText = usuario.tipo_acesso || "acesso";
        
        // Lógica do Avatar (Foto ou Iniciais)
        if (usuario.foto_url && usuario.foto_url !== "") {
            if (photoImg) {
                photoImg.src = usuario.foto_url;
                photoImg.style.display = 'block';
            }
            if (initialsEl) initialsEl.style.display = 'none';
        } else {
            if (initialsEl) {
                const iniciais = usuario.nome ? usuario.nome.substring(0, 2).toUpperCase() : "AT";
                initialsEl.innerText = iniciais;
                initialsEl.style.display = 'block';
            }
            if (photoImg) photoImg.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro ao processar dados do usuário:", e);
    }
}

/**
 * ESCONDE ELEMENTOS QUE SÃO APENAS PARA ADMINISTRADORES
 */
function aplicarRestricoesPorNivel() {
    const usuarioJson = localStorage.getItem('usuario');
    if (!usuarioJson) return;

    const usuario = JSON.parse(usuarioJson);

    if (usuario.tipo_acesso !== 'admin') {
        // Esconde botões do menu com a classe .admin-only
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.removeProperty('display'); // Garante limpeza
            el.style.display = 'none';
        });
    }
}

/**
 * MOTOR DE NAVEGAÇÃO PRINCIPAL (SPA)
 */
async function navegar(modulo) {
    const main = document.getElementById('main-content');
    const menu = document.getElementById('nav-main-menu');
    if (!main) return;

    if (menu) menu.classList.remove('active');

    main.innerHTML = `<div class="loading">a carregar ${modulo}...</div>`;
    marcarMenuAtivo(modulo);

    try {
        await new Promise(r => setTimeout(r, 50));

        switch(modulo) {
            case 'dashboard':  await renderDashboard(); break;
            case 'stock':      await renderStock(); break;
            case 'usuarios':   await renderUsuarios(); break;
            case 'movimentos': await renderMovimentos(); break;
            case 'provincias': await renderProvincias(); break;
            case 'perfil':     await renderPerfil(); break;
            case 'ranking':    await renderRanking(); break;
            default: console.warn("Módulo não encontrado:", modulo);
        }
    } catch (e) {
        console.error("Erro ao renderizar módulo:", e);
        main.innerHTML = `<div class="primavera-card">erro ao carregar dados de ${modulo}.</div>`;
    }
}

function toggleMenu() {
    const menu = document.getElementById('nav-main-menu');
    if (menu) menu.classList.toggle('active');
}

function marcarMenuAtivo(modulo) {
    document.querySelectorAll('.menu-items button').forEach(btn => btn.classList.remove('active-nav'));
    const btn = document.getElementById(`btn-${modulo}`);
    if (btn) btn.classList.add('active-nav');
    
    const perfil = document.getElementById('nav-perfil-block');
    if (perfil) {
        if (modulo === 'perfil') perfil.classList.add('active-nav');
        else perfil.classList.remove('active-nav');
    }
}

/**
 * LOGOUT COM CONFIRMAÇÃO
 */
function fecharSessao() {
    exibirConfirmacao(
        "encerrar sessão", 
        "deseja realmente sair do sistema africantech?", 
        () => {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    );
}

/**
 * FUNÇÃO DE MODAL DE CONFIRMAÇÃO
 */
function exibirConfirmacao(titulo, mensagem, callback) {
    const modal = document.getElementById('modal-confirmacao');
    const txtTitulo = document.getElementById('confirm-titulo');
    const txtMensagem = document.getElementById('confirm-mensagem');
    const btnOk = document.getElementById('confirm-btn-ok');
    const btnCancel = document.getElementById('confirm-btn-cancelar');

    // Se algum elemento não existir, usa o confirm padrão do navegador para não travar
    if (!modal || !txtTitulo || !txtMensagem || !btnOk || !btnCancel) {
        if (confirm(mensagem)) callback();
        return;
    }

    txtTitulo.innerText = titulo;
    txtMensagem.innerText = mensagem;

    // IMPORTANTE: Use 'flex' para o seu CSS de modal overlay
    modal.style.display = 'flex';

    const novoBtnOk = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(novoBtnOk, btnOk);

    novoBtnOk.onclick = () => {
        modal.style.display = 'none';
        callback();
    };

    btnCancel.onclick = () => {
        modal.style.display = 'none';
    };
}

window.onclick = function(event) {
    const modalConfirm = document.getElementById('modal-confirmacao');
    if (event.target == modalConfirm) {
        modalConfirm.style.display = "none";
    }
}