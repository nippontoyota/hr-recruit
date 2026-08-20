import os

path = 'e:/Projects/NipponToyota/RecruitmentPortal/frontend/src/components/candidates/EvaluationStageWidget.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { format, addDays } from 'date-fns';", "")
content = content.replace("addDays(new Date(), 1)", "new Date(Date.now() + 86400000)")
content = content.replace("format(tomorrow, \"yyyy-MM-dd'T'HH:mm\")", "(() => { const d = tomorrow; const pad = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })()")
content = content.replace("format(parsedDate, 'dd MMM yyyy')", "new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate)")
content = content.replace("format(parsedDate, 'h:mm a')", "new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsedDate).toLowerCase()")
content = content.replace("format(new Date(), 'dd/MM/yyyy')", "new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())")
content = content.replace("format(new Date(), 'HH:mm')", "new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())")
content = content.replace("format(new Date(), 'h:mm a')", "new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toLowerCase()")
content = content.replace("format(new Date(ev.scheduled_time), 'MMM dd, yyyy')", "new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(ev.scheduled_time))")
content = content.replace("format(new Date(ev.scheduled_time), 'hh:mm a')", "new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ev.scheduled_time)).toLowerCase()")
content = content.replace("format(new Date(shareEval.scheduled_time), 'MMM dd, yyyy')", "new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(shareEval.scheduled_time))")
content = content.replace("format(new Date(shareEval.scheduled_time), 'hh:mm a')", "new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shareEval.scheduled_time)).toLowerCase()")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
