// Local Lucide assets share one 24px viewport, independent of font baselines.
const names=new Set(['crown-solid','crown','check','ellipsis','loader-circle','circle-alert','x','arrow-left']);
export function uiIcon(name) {
    if(!names.has(name))return '';
    return `<span class="ui-icon ui-icon-${name}" style="--ui-icon:url('/images/ui-icons/${name}.svg')" aria-hidden="true"></span>`;
}
