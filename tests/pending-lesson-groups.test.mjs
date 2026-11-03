import assert from 'node:assert/strict';
import { pendingLessonGroups } from '../academy.js';

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
console.log('PASS: pending lessons are grouped by time and teacher');
