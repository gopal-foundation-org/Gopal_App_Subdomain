import {renderSelectedForm as ramForm,renderSuccess as ramSuccess} from '../ram/render.mjs';
import {renderSelectedForm as sitaForm,renderSuccess as sitaSuccess} from '../sita/render.mjs';
import {resolveRegistration} from './model.mjs';

export function registrationMarkup(contents,scope,id,{preview=false,pending=true}={}) {
  const selected=resolveRegistration(contents,scope,id);
  if(!selected)return '<p role="status">Registration for this program is not currently open. <a href="/programs/">Explore current programs</a>.</p>';
  return (scope==='sita'?sitaForm:ramForm)(selected.opportunity,selected.content,preview,{pending});
}
export function successMarkup(selected,email) {
  return (selected.scope==='sita'?sitaSuccess:ramSuccess)(selected.opportunity,selected.form,selected.program,email);
}
