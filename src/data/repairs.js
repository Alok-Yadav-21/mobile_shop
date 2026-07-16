const now = Date.now(), h=3600000, d=86400000
export const REPAIRS = [
  { ref:'SPR-4805', customer:'Maria Lopez', phone:'07700 900111', email:'maria@demo.com', branch:'wol', device:'Phone', brand:'Apple', model:'iPhone 13', problem:'Screen replacement', fulfilment:'In-store', status:'Ready for collection', quote:119, tech:'Priya', createdAt:now-2*d,
    history:[['Booking received',now-2*d],['Device received',now-2*d+h],['Diagnostics',now-2*d+2*h],['Quote awaiting approval',now-2*d+3*h],['Repair in progress',now-1*d],['Quality check',now-20*h],['Ready for collection',now-18*h]],
    notes:[{by:'Priya', text:'Screen fitted, tested OK.', at:now-19*h}] },
  { ref:'SPR-4806', customer:'Tom Reid', phone:'07700 900222', email:'tom@demo.com', branch:'blv', device:'Laptop', brand:'Dell', model:'XPS 13', problem:'Battery replacement', fulfilment:'Collection', status:'Repair in progress', quote:95, tech:'Jason', createdAt:now-1*d,
    history:[['Booking received',now-1*d],['Device received',now-22*h],['Diagnostics',now-20*h],['Quote awaiting approval',now-19*h],['Repair in progress',now-6*h]], notes:[] },
  { ref:'SPR-4807', customer:'Sara Khan', phone:'07700 900333', email:'sara@demo.com', branch:'sid', device:'Phone', brand:'Samsung', model:'Galaxy S22', problem:'Charging-port repair', fulfilment:'In-store', status:'Quote awaiting approval', quote:69, tech:null, createdAt:now-5*h,
    history:[['Booking received',now-5*h],['Device received',now-4*h],['Diagnostics',now-3*h],['Quote awaiting approval',now-2*h]], notes:[{by:'Aman', text:'Port needs replacing; quote sent.', at:now-2*h}] },
  { ref:'SPR-4808', customer:'Alex Kaur', phone:'07700 900123', email:'customer@demo.com', branch:'wol', device:'Tablet', brand:'Apple', model:'iPad Air', problem:'Water-damage check', fulfilment:'In-store', status:'Booking received', quote:null, tech:null, createdAt:now-1*h,
    history:[['Booking received',now-1*h]], notes:[] },
]
export const TECHS = ['Aman','Priya','Jason','Leah','Sam']
