export const rosterStatusOptions={attendance:['present','late','absent'],homework_status:['완료','일부','미완료'],attitude:['좋음','보통','집중 필요']};
export function rosterStatusValues(draft={},attendance={}){
  const values={attendance:draft.attendance||attendance.status||'present',homework_status:draft.homework_status||attendance.body?.homework_status||'완료',attitude:draft.attitude||attendance.body?.attitude||'좋음'};
  if(values.attendance==='unmarked')values.attendance='present';
  if(values.attitude==='집중 도움 필요')values.attitude='집중 필요';
  return values;
}
export function nextRosterStatus(key,value){const list=rosterStatusOptions[key];return list?list[(list.indexOf(value)+1)%list.length]:value;}
export function rosterStatusLabel(key,value){return key==='attendance'?({present:'출석',late:'지각',absent:'결석'})[value]||value:key==='homework_status'?'과제 '+value:value==='집중 필요'?value:'집중 '+value;}
