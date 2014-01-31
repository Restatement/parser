body = line+

line = text newlines /
       lastline:text

newlines = "\n"+ {return '';}

text = chars:[^\n]+ {return chars.join('').trim(); }