export function renderNotFound(container) {
    container.innerHTML = `
        <div id="error-msg" style="display:block;">
            <p>الصفحة المطلوبة غير موجودة.</p>
            <a href="/" class="btn btn-primary" style="display:inline-block; margin-top:15px;">العودة للرئيسية</a>
        </div>`;
}

export default function NotFoundPage(container) {
    renderNotFound(container);
}
