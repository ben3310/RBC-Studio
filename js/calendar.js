function escapeIcs(text){return String(text||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function stamp(date,time){return (date||'1970-01-01').replace(/-/g,'')+'T'+(time||'00:00').replace(':','')+'00';}

export function buildCalendar({campaignId,title,date,events}){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RareBagClub//RBC Studio//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const event of events){
    const summary=title+' · '+event.platform+(event.buyerLabel?' · '+event.buyerLabel:'');
    const eventDate=event.date||date;
    const uid=campaignId+'-'+(event.uid||event.platform)+'@rarebagclub';
    lines.push('BEGIN:VEVENT','UID:'+uid,'DTSTART:'+stamp(eventDate,event.time),'DTEND:'+stamp(eventDate,event.time),'SUMMARY:'+escapeIcs(summary),'DESCRIPTION:'+escapeIcs(String(event.copy||'').slice(0,200)),'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY','DESCRIPTION:Prepare '+escapeIcs(event.platform)+' post','END:VALARM','END:VEVENT');
  }
  lines.push('END:VCALENDAR');return lines.join('\r\n');
}
