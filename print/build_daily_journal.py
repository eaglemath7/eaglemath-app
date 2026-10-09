from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('K',str(ROOT / 'print/fonts/NanumGothic-Regular.ttf')))
p=str(ROOT / 'print/forms/eaglemath-daily-journal-15-students.pdf')
c=canvas.Canvas(p,pagesize=A4);W,H=A4
c.setTitle('독수리수학 하루 수업일지 - 15명씩 2장')
navy='#193C60';gray='#586570';border='#8996A2'
def text(x,y,s,size=9,col='#202C38'):
 c.setFillColor(col);c.setFont('K',size);c.drawString(x*mm,H-y*mm,s)
def line(x,y,x2,y2,col=border,width=.5):
 c.setStrokeColor(col);c.setLineWidth(width);c.line(x*mm,H-y*mm,x2*mm,H-y2*mm)
def box(x,y,w,h,fill=None):
 c.setStrokeColor(border);c.setLineWidth(.55)
 if fill:c.setFillColor(fill)
 c.rect(x*mm,H-(y+h)*mm,w*mm,h*mm,fill=bool(fill),stroke=1)
for page in range(2):
 c.setFillColor(navy);c.rect(10*mm,H-9*mm,190*mm,1.5*mm,fill=1,stroke=0)
 c.drawImage(str(ROOT / 'logo.png'),10*mm,H-26*mm,width=38*mm,height=13.66*mm,mask='auto')
 text(52,21,'하루 수업일지',12,navy)
 text(85,21,'수업일  ____년  ___월  ___일',9)
 text(146,21,'담당  ______________',9)
 xs=[10,18,48,115,158,200]
 labels=['번호','학년 / 이름','교재·단원·페이지 / 배운 내용','오늘의 과제','관찰 메모 / 테스트']
 for j in range(5):
  box(xs[j],32,xs[j+1]-xs[j],8,'#EDF2F6');text(xs[j]+1.5,37.5,labels[j],7.5,navy)
 for i in range(15):
  y=40+i*16
  for j in range(5):box(xs[j],y,xs[j+1]-xs[j],16)
  text(11.5,y+9.3,str(page*15+i+1),8,gray)
  text(20,y+6,'학년',7,gray);line(27,y+6.8,46,y+6.8,'#CBD2D9',.35)
  text(20,y+13,'이름',7,gray);line(27,y+14,46,y+14,'#CBD2D9',.35)
  for j in range(2,5):line(xs[j]+1.5,y+8,xs[j+1]-1.5,y+8,'#D8DEE4',.35)
 text(11,285,'학년·이름 필수 · 수업 순서대로 두 줄 작성 · 단원평가: 학기·단원·점수 작성 · 촬영 시 네 모서리 포함',7.5,gray)
 line(10,288,200,288,navy,1.2)
 c.showPage()
c.save();print(p)
