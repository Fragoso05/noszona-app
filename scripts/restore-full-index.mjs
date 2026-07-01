import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let html = execSync('git show 2f29289:html/index.html', { cwd: root, encoding: "utf8" });

html = html.replaceAll("../img/", "img/");
html = html.replaceAll("../css/", "css/");
html = html.replaceAll("../js/", "js/");
html = html.replace("#061827", "#061887");

html = html.replace(
  '<link rel="stylesheet" href="css/style.css">',
  '<link rel="stylesheet" href="css/style.css">\n<link rel="stylesheet" href="css/fotos.css">'
);

html = html.replace(
  '<section id="registo" class="form-section">',
  '<section id="registo" class="form-section" style="display:none;">'
);
html = html.replace(
  '<section id="login" class="form-section">',
  '<section id="login" class="form-section" style="display:none;">'
);
html = html.replace(
  '<section id="recuperar" class="form-section">',
  '<section id="recuperar" class="form-section" style="display:none;">'
);
html = html.replace('<section id="dashboard">', '<section id="dashboard" style="display:none;">');

html = html.replace(
  /  <\/div>\s*\n\s*\n\s*\n<\/section>\s*\n\s*<!-- PACKAGES -->/,
  "  </div>\n\n  </div>\n</section>\n\n<!-- PACKAGES -->"
);

const fotosBlock = `<div class="fotos-registo-box">
  <h3>Fotos do residente</h3>
  <p>Podes tirar foto agora ou escolher dos ficheiros. A foto de perfil é opcional. A foto do BI será confirmada pelo administrador.</p>
  <div class="fotos-registo-grid">
    <div class="foto-registo-card">
      <label>Foto de perfil opcional</label>
      <div id="previewFotoPerfil" class="foto-preview-registo perfil"><span>Sem foto de perfil</span></div>
      <div class="foto-registo-actions">
        <button type="button" onclick="tirarFoto('perfil')">Tirar foto</button>
        <button type="button" onclick="abrirSeletorFoto('perfil')">Escolher ficheiro</button>
        <button type="button" class="btn-remover-foto" onclick="removerFotoPerfil()">Remover</button>
      </div>
      <input id="inputFotoPerfil" type="file" accept="image/*" style="display:none" onchange="selecionarFotoPerfil(this)">
      <input id="inputCameraPerfil" type="file" accept="image/*" capture="user" style="display:none" onchange="selecionarFotoCameraPerfil(this)">
    </div>
    <div class="foto-registo-card">
      <label>Foto do Bilhete de Identidade</label>
      <div id="previewFotoBI" class="foto-preview-registo"><span>Sem foto do BI</span></div>
      <div class="foto-registo-actions">
        <button type="button" onclick="tirarFoto('bi')">Tirar foto</button>
        <button type="button" onclick="abrirSeletorFoto('bi')">Escolher ficheiro</button>
        <button type="button" class="btn-remover-foto" onclick="removerFotoBI()">Remover</button>
      </div>
      <input id="inputFotoBI" type="file" accept="image/*" style="display:none" onchange="selecionarFotoBI(this)">
      <input id="inputCameraBI" type="file" accept="image/*" capture="environment" style="display:none" onchange="selecionarFotoCameraBI(this)">
    </div>
  </div>
</div>

        <div class="form-group full form-checkbox">
          <label class="checkbox-label" for="termos">
            <input type="checkbox" id="termos" required onchange="var e=document.getElementById('erro-termos');if(e){e.textContent='';e.classList.remove('visible');}">
            Li e aceito os Termos e Condições e a Política de Privacidade.
          </label>
          <a href="#" onclick="mostrarTermos(); return false;" style="font-size:12px;color:var(--blue);text-decoration:underline;margin-left:28px;">ver termos</a>
          <span class="field-error" id="erro-termos"></span>
        </div>`;

html = html.replace(
  "        </div>\n\n        <div class=\"payment-info-box\">",
  `        </div>\n\n${fotosBlock}\n\n        <div class="payment-info-box">`
);

html = html.replace(
  '<button onclick="loginWithGoogle()"',
  '<button type="button" onclick="loginWithGoogle()"'
);

html = html.replace(
  '<label class="checkbox-label">\n              <input type="checkbox" id="lembrar">',
  '<label class="checkbox-label" for="lembrar">\n              <input type="checkbox" id="lembrar">'
);

html = html.replace(
  /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/qrcodejs\/1\.0\.0\/qrcode\.min\.js"><\/script>\s*<script src="js\/script\.js"><\/script>/,
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="js/security.js"></script>
<script src="js/main.js"></script>
<script src="js/fotos.js"></script>`
);

writeFileSync(join(root, "index.html"), html, "utf8");
console.log("Restored full index.html");