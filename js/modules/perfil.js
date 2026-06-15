/**
 * js/modules/perfil.js
 * Módulo de Gestão de Conta do Utilizador
 */

async function renderPerfil() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="loading">a processar a sua ficha de perfil...</div>`;

    const res = await api.request('/perfil/me');

    if (res && res.sucesso) {
        const u = res.dados;
        const iniciais = u.nome.substring(0, 2).toUpperCase();

        main.innerHTML = `
            <div class="profile-card-wrapper">
                <div class="profile-card">
                    <div class="profile-photo-big">
                        ${u.foto_url ? `<img src="${u.foto_url}">` : iniciais}
                    </div>
                    
                    <h3>${u.nome.toLowerCase()}</h3>
                    <p class="subtitle">${u.funcao.toLowerCase()} |  ${u.provincia_nome.toLowerCase()}</p>

                    <div class="profile-info-grid">
                        <div class="profile-field">
                            <label>e-mail de acesso</label>
                            <span>${u.email}</span>
                        </div>
                        <div class="profile-field">
                            <label>contacto telefónico</label>
                            <span>${u.telefone || 'não registado'}</span>
                        </div>
                    </div>

                    <div class="security-section">
                        <h4>🔒 alterar senha de segurança</h4>
                        
                        <div class="profile-field" style="margin-bottom:15px;">
                            <label>senha actual</label>
                            <input type="password" id="pass-atual" class="input-erp" style="width:100%" placeholder="••••••••">
                        </div>
                        
                        <div class="profile-field">
                            <label>nova senha</label>
                            <input type="password" id="pass-nova" class="input-erp" style="width:100%" placeholder="mínimo 6 caracteres">
                        </div>

                        <button class="btn-update-profile" onclick="atualizarSenha()">actualizar credenciais</button>
                    </div>
                </div>
            </div>
        `;
    } else {
        main.innerHTML = `<div class="loading" style="color:red;">erro ao carregar perfil. tente novamente.</div>`;
    }
}

async function atualizarSenha() {
    const senhaAtual = document.getElementById('pass-atual').value;
    const novaSenha = document.getElementById('pass-nova').value;

    if(!senhaAtual || !novaSenha) {
        return alert("por favor, preencha ambos os campos de senha.");
    }

    if(novaSenha.length < 6) {
        return alert("a nova senha deve ter pelo menos 6 caracteres.");
    }

    const res = await api.request('/perfil/alterar-senha', 'PATCH', { senhaAtual, novaSenha });
    
    if(res && res.sucesso) {
        alert("credenciais actualizadas com sucesso!");
        document.getElementById('pass-atual').value = '';
        document.getElementById('pass-nova').value = '';
    } else {
        alert("erro: " + (res ? res.mensagem : "falha na comunicação com o servidor"));
    }
}