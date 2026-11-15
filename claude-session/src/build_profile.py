import base64,re
def b(p,mime='image/webp'): return f"data:{mime};base64,"+base64.b64encode(open(p,'rb').read()).decode()
A='../assets/'
t=open('profile.tpl.html',encoding='utf-8').read()
t=t.replace('{{CSS}}',open('profile.css').read())
for k,f in dict(LOGO='img0.webp',SPHERE='img1.webp',OHS='img4.webp',JAWDAH='img5.webp').items():
    t=t.replace('{{'+k+'}}',b(A+f))
open('../out/madar-profile.html','w',encoding='utf-8').write(t)
print(len(t))
