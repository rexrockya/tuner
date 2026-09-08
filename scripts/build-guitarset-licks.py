"""Build 20 CC BY 4.0 GuitarSet excerpts. Audio is cropped live mic recording; TAB uses exact JAMS string/pitch/onset/duration (not generated composition)."""
import pathlib,json,wave,hashlib,subprocess,html,math,argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir',type=pathlib.Path,required=True,help='Directory containing the ten selected original JAMS and *_mic.wav files')
parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('docs/assets/licks/guitarset'))
args=parser.parse_args();SRC=args.source_dir;OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
STYLE={'Rock':'Rock Blues','SS':'Singer-songwriter Blues','Funk':'Funk Blues','Jazz':'Jazz Blues','BN':'Bossa Blues'}
TUNING=[40,45,50,55,59,64]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def chord(s):
 root,quality=s.split(':',1);return root+{'maj':'','min':'m','7':'7','maj7':'maj7','min7':'m7'}.get(quality,quality)
def render_tab(item,notes):
 W,H=1540,475;left,right=68,1516;barw=(right-left)/2;rowh=205
 svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img"><title>{html.escape(item["name"])} — performance tablature</title><rect width="100%" height="100%" fill="#fffdf5"/><g font-family="Arial,sans-serif" fill="#17251c">',f'<text x="26" y="29" font-size="19" font-weight="600">{html.escape(item["name"])} · {item["originalBpm"]} BPM · 4/4</text>']
 for row in range(2):
  top=83+row*rowh
  for string in range(6):
   y=top+string*23;svg.append(f'<line x1="{left}" y1="{y}" x2="{right}" y2="{y}" stroke="#69766a" stroke-width="1"/><text x="31" y="{y+5}" font-size="16">{["e","B","G","D","A","E"][string]}</text>')
  for b in range(9):
   x=left+b*barw/4;major=b%4==0;svg.append(f'<line x1="{x}" y1="{top-10}" x2="{x}" y2="{top+122}" stroke="{("#334435" if major else "#d6dccf")}" stroke-width="{(1.5 if major else .7)}"/>')
   if b<8:svg.append(f'<text x="{x+9}" y="{top+148}" font-size="13" fill="#60705d">{b%4+1}</text>')
  for b in range(2):
   absolute=row*2+b;x=left+b*barw;svg.append(f'<text x="{x+8}" y="{top-25}" font-size="20" font-weight="600">{html.escape(item["chords"][absolute])}</text><text x="{x+barw-40}" y="{top-25}" font-size="13" fill="#60705d">{item["sourceMeasures"][0]+absolute}</text>')
  row_start=row*8*60/item['originalBpm'];row_end=(row+1)*8*60/item['originalBpm']
  for note in notes:
   if note['time']+note['duration']<=row_start or note['time']>=row_end:continue
   x=left+(max(row_start,note['time'])-row_start)*item['originalBpm']/60*(barw/4);xend=left+(min(row_end,note['time']+note['duration'])-row_start)*item['originalBpm']/60*(barw/4);y=top+(5-note['stringIndex'])*23
   svg.append(f'<line x1="{x:.2f}" y1="{y+7}" x2="{max(x+2,xend):.2f}" y2="{y+7}" stroke="#4f917a" stroke-width="3" opacity=".42"/><rect x="{x-12:.2f}" y="{y-11}" width="25" height="22" rx="4" fill="#fffdf5"/><text x="{x:.2f}" y="{y+7}" text-anchor="middle" font-size="20" font-weight="600">{note["fret"]}</text>')
 svg.append('<text x="26" y="463" font-size="13" fill="#60705d">GuitarSet · CC BY 4.0 · 按原始标注制谱；横向位置表示演奏时刻，绿色线表示延音。</text></g></svg>');return ''.join(svg)
entries=[];proof=[]
selected=[f'{p:02d}_{song}_solo.jams' for p in [0,1] for song in ['Rock1-90-C#','SS1-100-C#','Funk1-97-C','Jazz1-130-D','BN1-129-Eb']]
for source in [SRC/name for name in sorted(selected)]:
 j=json.loads(source.read_text());ann=j['annotations'];tempo=int(next(a['data'][0]['value'] for a in ann if a['namespace']=='tempo'));key=next(a['data'][0]['value'] for a in ann if a['namespace']=='key_mode').replace(':major',' Major').replace(':minor',' Minor')
 beats=next(a['data'] for a in ann if a['namespace']=='beat_position');chords=next(a['data'] for a in ann if a['namespace']=='chord');track=source.stem;styleCode=''.join(c for c in track.split('_')[1].split('-')[0] if c.isalpha());style=STYLE[styleCode];performer=int(track[:2])+1
 wav=source.with_name(track+'_mic.wav')
 with wave.open(str(wav),'rb') as audio: rate=audio.getframerate();frames=audio.getnframes();channels=audio.getnchannels()
 assert channels==1
 for start_measure in [5,9]:
  start=next(x['time'] for x in beats if x['value']['measure']==start_measure and x['value']['position']==1);end=start+16*60/tempo
  first,last=round(start*rate),min(frames,round(end*rate));start=first/rate;end=last/rate
  assert abs((end-start)-16*60/tempo)<0.03, (track,start_measure,start,end,frames/rate,16*60/tempo)
  id='gs'+track[:2]+styleCode.lower()+str(start_measure)
  basename=id;mp3=OUT/(basename+'.mp3');svg=OUT/(basename+'.svg');annotation=OUT/(basename+'.json')
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',f'atrim=start_sample={first}:end_sample={last},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.002,afade=t=out:st={end-start-.002}:d=0.002','-codec:a','libmp3lame','-b:a','128k','-map_metadata','-1',str(mp3)],check=True)
  notes=[]
  for a in ann:
   if a['namespace']!='note_midi':continue
   si=int(a['annotation_metadata']['data_source'])
   for n in a['data']:
    if n['time']>=end or n['time']+n['duration']<=start:continue
    pitch=round(n['value']);fret=pitch-TUNING[si];assert 0<=fret<=24
    notes.append({'time':round(max(start,n['time'])-start,6),'duration':round(min(end,n['time']+n['duration'])-max(start,n['time']),6),'midi':pitch,'sourceMidi':n['value'],'stringIndex':si,'fret':fret,'carryIn':n['time']<start,'sourceTime':n['time'],'sourceDuration':n['duration']})
  notes.sort(key=lambda n:(n['time'],n['stringIndex']));assert len(notes)>=6
  barChords=[chord(next(x['value'] for x in chords if x['time']<=start+(b+.25)*4*60/tempo<x['time']+x['duration']+.00001)) for b in range(4)]
  item={'id':id,'name':f'{style} · {key.split()[0]} · 演奏 {performer:02d} · {start_measure}–{start_measure+3}','group':style,'chord':' → '.join(barChords),'chords':barChords,'degree':'Blues','bars':4,'kind':'blues','key':key,'keyCode':key.split()[0].lower(),'meter':'4/4','originalBpm':tempo,'sourceMeasures':[start_measure,start_measure+3],'sourceName':'GuitarSet','sourceType':'guitarset','sourceUrl':'https://zenodo.org/records/3371780','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','notation':'演奏 TAB','sourceTrack':track,'score':'assets/licks/guitarset/'+svg.name,'audio':'assets/licks/guitarset/'+mp3.name,'annotation':'assets/licks/guitarset/'+annotation.name,'duration':round(end-start,6),'searchText':f'{style} {key} blues guitarset 真人 木吉他 TAB {track} {" ".join(barChords)}'.lower()}
  svg.write_text(render_tab(item,notes),encoding='utf8');annotation.write_text(json.dumps({'sourceTrack':track,'startSeconds':start,'endSeconds':end,'startSample':first,'endSample':last,'sampleRate':rate,'originalBpm':tempo,'notes':notes},ensure_ascii=False,indent=2),encoding='utf8');entries.append(item);proof.append({'id':id,'sourceTrack':track,'sourceAudioSha256':sha(wav),'sourceAnnotationSha256':sha(source),'audioSha256':sha(mp3),'scoreSha256':sha(svg),'annotationSha256':sha(annotation),'audioBytes':mp3.stat().st_size,'noteCount':len(notes),'startSeconds':start,'endSeconds':end,'sourceMeasures':[start_measure,start_measure+3]})
(OUT/'manifest.json').write_text(json.dumps({'dataset':'GuitarSet 1.1.0','source':'https://zenodo.org/records/3371780','license':'CC BY 4.0','authors':['Qingyang Xi','Rachel M. Bittner','Johan Pauwels','Xuzhou Ye','Juan P. Bello'],'retrieved':'2026-09-08','count':len(entries),'files':proof},ensure_ascii=False,indent=2),encoding='utf8')
(OUT.parent/'guitarset-index.js').write_text('window.lessonPlayer.registerSupplemental('+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf8')
print(json.dumps({'count':len(entries),'audioBytes':sum(x['audioBytes'] for x in proof),'noteCounts':[x['noteCount'] for x in proof],'output':str(OUT)},indent=2))
