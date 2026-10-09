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
 c.drawImage(str(ROOT / 'logo.png'),10*mm,H-29*mm,width=47*mm,height=16.9*mm,mask='auto')
 text(131,22,'하루 수업일지',18,navy);text(160,29,f'{page+1} / 2 장',8,gray)
 text(11,39,'수업일  ______년  ____월  ____일',10)
 text(107,39,'담당 선생님  __________________',10)
 text(11,47,'수업한 순서대로 작성 · 학생별 두 줄 · 학년과 이름은 정확히 적어주세요.',8,gray)
 xs=[10,18,48,115,158,200]
 labels=['번호','학년 / 이름','교재·단원·페이지 / 배운 내용','오늘의 과제','관찰 메모 / 테스트']
 for j in range(5):
  box(xs[j],52,xs[j+1]-xs[j],9,'#EDF2F6');text(xs[j]+1.5,58,labels[j],7.5,navy)
 for i in range(15):
  y=61+i*14
  for j in range(5):box(xs[j],y,xs[j+1]-xs[j],14)
  text(11.5,y+8.3,str(page*15+i+1),8,gray)
  text(20,y+5,'학년',7,gray);line(27,y+5.8,46,y+5.8,'#CBD2D9',.35)
  text(20,y+11.4,'이름',7,gray);line(27,y+12.2,46,y+12.2,'#CBD2D9',.35)
  for j in range(2,5):line(xs[j]+1.5,y+7,xs[j+1]-1.5,y+7,'#D8DEE4',.35)
 text(11,278,'학년 예: 초3 · 중1 · 고2   |   15명 이하는 첫 장만, 16명부터는 둘째 장에 이어서 작성하세요.',7.5,gray)
 text(11,283,'촬영: 종이를 평평하게 놓고 한 장씩, 네 모서리가 모두 보이도록 찍어주세요.',7.5,gray)
 line(10,288,200,288,navy,1.2)
 c.showPage()
c.save();print(p)
