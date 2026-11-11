import assert from 'node:assert/strict';
import { lessonStatusForStudent, pendingLessonGroups } from '../academy.js';

const teachers=[{id:'t1',name:'김선생'},{id:'t2',name:'박선생'}];
const groups=pendingLessonGroups([
  {studentId:'s3',period:'1500-1550',teacherIds:['t1']},
  {studentId:'s1',period:'1400-1450',teacherIds:['t2']},
  {studentId:'s2',period:'1400-1450',teacherIds:['t1']},
  {studentId:'s4',period:'1400-1450',teacherIds:[]}
],teachers);

assert.deepEqual(groups.map(group=>group.period),['1400-1450','1500-1550']);
assert.deepEqual(groups[0].teacherGroups.map(group=>group.teacherNames.join(' · ')),['김선생','미배정','박선생']);
assert.equal(groups[0].teacherGroups.reduce((sum,group)=>sum+group.sessions.length,0),3);
assert.equal(groups[1].teacherGroups[0].teacherNames[0],'김선생');
assert.deepEqual(lessonStatusForStudent({attendance:'present',homework_status:'완료',attitude:'좋음','attendance:s2':'late','homework_status:s2':'일부'},'s2'),{attendance:'late',homework_status:'일부',attitude:'좋음'});
assert.deepEqual(lessonStatusForStudent({},'s3',{attendance:'absent',homework_status:'미완료',attitude:'집중 도움 필요'}),{attendance:'absent',homework_status:'미완료',attitude:'집중 도움 필요'});
console.log('PASS: pending lessons are grouped by time and teacher');
