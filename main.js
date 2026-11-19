// Only catalogue values may enter analytics or tab-scoped selection storage.
const spacyesEnquiry = {
  branches: ['Kandivali West','Kandivali East','Borivali West'],
  plans: ['Daily','Weekly','Fortnightly','Monthly','Weekend','Any 30 Days','Quarterly','Half-Yearly','Yearly','Daily Desk','Monthly Desk','Day Pass','Corporate / Team Desks','Co-Working / WFH','Corporate Team Desks'],
  mobile(value) {
    if (!/^[+\d\s()-]+$/.test(value)) return '';
    const compact=value.replace(/[\s()-]/g,'');
    const match=compact.match(/^(?:\+?91)?([6-9]\d{9})$/);
    return match ? match[1] : '';
  },
  context(value) {
    return {branch:this.branches.includes(value?.branch)?value.branch:'',plan:this.plans.includes(value?.plan)?value.plan:''};
  },
  event(name, context, channel, location) {
    if (!['trial_cta_click','membership_enquiry_click','plan_select','branch_select','contact_click','enquiry_handoff'].includes(name)) return;
    const params=this.context(context);
    if (['whatsapp','email','telephone'].includes(channel)) params.contact_channel=channel;
    params.cta_location=['pricing','form','navigation','footer','mobile_bar','help','content'].includes(location)?location:'content';
    params.send_to='G-N36ZSN4PE0';
    if(typeof window.gtag==='function') window.gtag('event',name,params);
  }
};

document.addEventListener('DOMContentLoaded',function(){
if(window.__spacyesEnquiryReady)return;
window.__spacyesEnquiryReady=true;

var contextKey='spacyes.enquiry.selection.v1',selection={branch:'',plan:''},contactHrefs=new WeakMap();
try{selection=spacyesEnquiry.context(JSON.parse(sessionStorage.getItem(contextKey)||'{}'))}catch(error){}
var branchField=document.querySelector('#form-branch-quick [name="branch"]');
if(branchField)selection.branch=spacyesEnquiry.context({branch:branchField.value}).branch;
function remember(){try{sessionStorage.setItem(contextKey,JSON.stringify(selection))}catch(error){}}
function syncSelection(){
document.querySelectorAll('.form-wrap').forEach(function(form){
['branch','plan'].forEach(function(key){
var field=form.querySelector('[name="'+key+'"]'),value=selection[key];
if(!field||(key!=='plan'&&!value))return;
if(field.tagName==='SELECT'&&!Array.from(field.options).some(function(o){return o.value===value}))return;
if(key==='branch'&&branchField)value=branchField.value;
field.value=value;
form.querySelectorAll('.pill').forEach(function(pill){if(pill.closest('.pill-group').nextElementSibling===field)pill.classList.toggle('on',pill.dataset.val===value)});
});
});
}
syncSelection();remember();
function locationOf(el){
if(el.closest('.mobile-action-bar'))return 'mobile_bar';
if(el.closest('.wa-help'))return 'help';
if(el.closest('footer'))return 'footer';
if(el.closest('nav'))return 'navigation';
if(el.closest('form'))return 'form';
if(el.closest('.plan-card'))return 'pricing';
return 'content';
}
function choose(key,value,el){
var safe=spacyesEnquiry.context({[key]:value})[key];
if(!safe&&!(key==='plan'&&value===''))return;
selection[key]=safe;remember();syncSelection();
spacyesEnquiry.event(key+'_select',selection,null,locationOf(el));
}
function validateEnquiry(form,data){
var error=form.querySelector('.enquiry-error');
if(!error){error=document.createElement('p');error.className='form-note enquiry-error';error.id=form.id+'-error';error.setAttribute('role','alert');form.appendChild(error)}
error.textContent='';error.hidden=true;
form.querySelectorAll('[aria-invalid="true"]').forEach(function(input){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby')});
var key='',message='';
if(!data.name){key='name';message='Please enter your name.'}
else if(!spacyesEnquiry.mobile(data.phone||'')){key='phone';message='Enter a valid 10-digit Indian mobile number, with or without +91.'}
else if(data.email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||form.querySelector('[name="email"]').validity.typeMismatch)){key='email';message='Enter a valid email address or leave the optional email field empty.'}
if(message){error.hidden=false;error.textContent=message;var input=form.querySelector('[name="'+key+'"]');input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',error.id);input.focus();return false}
data.phone=spacyesEnquiry.mobile(data.phone);return true;
}
function trackHandoff(form,data,channel){
var safe=spacyesEnquiry.context(data);
spacyesEnquiry.event('contact_click',safe,channel,'form');
spacyesEnquiry.event('enquiry_handoff',safe,channel,'form');
}
document.addEventListener('click',function(event){
var el=event.target.closest('a,button');if(!el)return;
var pill=el.matches('.pill')&&el.closest('.pill-group');
if(pill){var field=pill.nextElementSibling;if(field&&['plan','branch'].includes(field.name))choose(field.name,el.dataset.val,el);return}
var card=el.matches('.plan-btn')&&el.closest('.plan-card');
if(card){var label=card.querySelector('.plan-nm'),plan=label&&label.textContent.trim();
if(plan==='Day Pass')plan='Daily Desk';
if(plan==='Corporate / Team'||plan==='Corporate / Team Desks')plan='Corporate Team Desks';
if(plan)choose('plan',plan,el);
spacyesEnquiry.event('membership_enquiry_click',selection,null,'pricing');
if(/trial/i.test(el.textContent))spacyesEnquiry.event('trial_cta_click',selection,null,'pricing');
return}
if(el.matches('.fwa,.fem'))return; // Validated form handler records the handoff once.
var href=el.getAttribute('href')||'',channel=/^tel:/i.test(href)?'telephone':/^mailto:/i.test(href)?'email':/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)?'whatsapp':'';
if(channel){
if(channel==='whatsapp'&&(selection.branch||selection.plan)){
if(!contactHrefs.has(el))contactHrefs.set(el,href);
var url=new URL(contactHrefs.get(el)),text=url.searchParams.get('text')||'Hi Spacyes!';
if(selection.branch)text+='\nBranch: '+selection.branch;
if(selection.plan)text+='\nPlan: '+selection.plan;
url.searchParams.set('text',text);el.href=url.href;
}
if(/trial|₹49/i.test(el.textContent)||el.closest('#cw-trial'))spacyesEnquiry.event('trial_cta_click',selection,null,locationOf(el));
spacyesEnquiry.event('contact_click',selection,channel,locationOf(el));return}
if(/trial|₹49/i.test(el.textContent)&&href.includes('#'))spacyesEnquiry.event('trial_cta_click',selection,null,locationOf(el));
});
document.addEventListener('change',function(event){var el=event.target;if(el.matches('.form-wrap select[name="plan"],.form-wrap select[name="branch"]'))choose(el.name,el.value,el)});

document.querySelectorAll('.email-link').forEach(function(link){
var user=link.dataset.user, domain=link.dataset.domain;
if(user&&domain){
var addr=user+'@'+domain;
link.href='mailto:'+addr;
var span=link.querySelector('.email-text');
if(span) span.textContent=addr;
}
});

var burger=document.getElementById('burger'),mnav=document.getElementById('mnav');
if(burger&&mnav){burger.addEventListener('click',function(){mnav.classList.toggle('open')})}

document.querySelectorAll('.faq-q').forEach(function(btn){
btn.addEventListener('click',function(){
var a=btn.nextElementSibling,open=a.classList.contains('open');
document.querySelectorAll('.faq-a').forEach(function(x){x.classList.remove('open')});
document.querySelectorAll('.faq-q').forEach(function(x){x.setAttribute('aria-expanded','false')});
if(!open){a.classList.add('open');btn.setAttribute('aria-expanded','true')}
});
});

document.querySelectorAll('.ptab').forEach(function(tab){
tab.addEventListener('click',function(){
document.querySelectorAll('.ptab').forEach(function(t){t.classList.remove('on')});
tab.classList.add('on');
var target=tab.dataset.tab;
document.querySelectorAll('.plans-panel').forEach(function(p){
if(p.dataset.panel===target){p.classList.remove('hidden');p.style.display='grid';}else{p.classList.add('hidden');p.style.display='none';}
});
});
});

document.querySelectorAll('.pill-group').forEach(function(group){
group.querySelectorAll('.pill').forEach(function(pill){
pill.addEventListener('click',function(){
group.querySelectorAll('.pill').forEach(function(p){p.classList.remove('on')});
pill.classList.add('on');
var hidden=group.nextElementSibling;
if(hidden&&hidden.type==='hidden') hidden.value=pill.dataset.val;
});
});
});

document.querySelectorAll('.rev-ftag').forEach(function(btn){
btn.addEventListener('click',function(){
var branch = btn.textContent.trim();
document.querySelectorAll('.rev-ftag').forEach(function(b){b.classList.remove('on')});
btn.classList.add('on');
document.querySelectorAll('.rev-card[data-branch]').forEach(function(card){
if(card.getAttribute('data-branch') === branch){
card.classList.remove('hidden');
} else {
card.classList.add('hidden');
}
});
});
});

var hc=document.getElementById('hero-carousel');
if(hc){
var hSlides=hc.querySelectorAll('.hc-slide');
var hTotal=hSlides.length,hCur=0;
function hGoTo(n){hCur=(n+hTotal)%hTotal;hc.style.transform='translateX(-'+hCur*100+'%)';}
setInterval(function(){hGoTo(hCur+1);},3000);
}

var carousel=document.getElementById('carousel');
if(carousel){
var slides=carousel.querySelectorAll('.carousel-slide');
var total=slides.length;
var current=0;
var dotsWrap=document.getElementById('carousel-dots');

for(var i=0;i<total;i++){
var dot=document.createElement('button');
dot.className='carousel-dot'+(i===0?' on':'');
dot.dataset.idx=i;
dot.addEventListener('click',function(){goTo(parseInt(this.dataset.idx))});
dotsWrap.appendChild(dot);
}
function goTo(n){
current=(n+total)%total;
carousel.style.transform='translateX(-'+current*100+'%)';
dotsWrap.querySelectorAll('.carousel-dot').forEach(function(d,i){
d.classList.toggle('on',i===current);
});
}
document.getElementById('carousel-prev').addEventListener('click',function(){goTo(current-1)});
document.getElementById('carousel-next').addEventListener('click',function(){goTo(current+1)});

setInterval(function(){goTo(current+1)},4000);
}

function wireForm(formId){
var form=document.getElementById(formId);
if(!form)return;
function get(){
var d={};
form.querySelectorAll('[name]').forEach(function(el){d[el.name]=el.value.trim()});

var bp=form.querySelector('#branch-val');
var pp=form.querySelector('#plan-val');
if(bp) d.branch=bp.value;
if(pp) d.plan=pp.value;
return d;
}
var wab=form.querySelector('.fwa'),emb=form.querySelector('.fem');
if(wab){wab.addEventListener('click',function(e){
e.preventDefault();var d=get();
if(!validateEnquiry(form,d))return;
var msg='Hi Spacyes!\n\nName: '+d.name+'\nPhone: '+d.phone;
if(d.email)msg+='\nEmail: '+d.email;
if(d.branch)msg+='\nBranch: '+d.branch;
if(d.plan)msg+='\nPlan: '+d.plan;
if(d.city)msg+='\nCity: '+d.city;
if(d.investment)msg+='\nInvestment: '+d.investment;
if(d.about)msg+='\nAbout: '+d.about;
if(d.message)msg+='\nMessage: '+d.message;
trackHandoff(form,d,'whatsapp');
window.open('https://wa.me/919869622564?text='+encodeURIComponent(msg),'_blank');
})}
if(emb){emb.addEventListener('click',function(e){
e.preventDefault();var d=get();
if(!validateEnquiry(form,d))return;
var body='Name: '+d.name+'\nPhone: '+d.phone;
if(d.email)body+='\nEmail: '+d.email;
if(d.branch)body+='\nBranch: '+d.branch;
if(d.plan)body+='\nPlan: '+d.plan;
if(d.city)body+='\nCity: '+d.city;
if(d.investment)body+='\nInvestment: '+d.investment;
if(d.about)body+='\nAbout: '+d.about;
if(d.message)body+='\nMessage: '+d.message;
var subj=d.city?'Franchise Enquiry — Spacyes':'Trial Booking — Spacyes';
trackHandoff(form,d,'email');
window.location.href='mailto:info@spacyes.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
})}
}
document.querySelectorAll('.form-wrap[id]').forEach(function(form){wireForm(form.id)});

(function(){
  if(!document.querySelector('.mobile-action-bar')){
    var bar=document.createElement('div');bar.className='mobile-action-bar';bar.setAttribute('aria-label','Quick contact actions');
    bar.innerHTML='<a href="/#plans">View Plans</a><a href="tel:+919869622564">Call</a><a class="wa-action" href="https://wa.me/919869622564?text='+encodeURIComponent('Hi Spacyes, I need help choosing a membership plan.')+'" target="_blank" rel="noopener">WhatsApp</a>';
    var pricing=document.querySelector('.branch-membership-grid');
    if(pricing){var section=pricing.closest('section');if(section){section.id=section.id||'branch-plans';bar.querySelector('a').href='#'+section.id}}
    document.body.appendChild(bar);
  }
  if(!document.querySelector('.wa-help')){
    var help=document.createElement('div');help.className='wa-help';help.innerHTML='<button class="wa-help-close" aria-label="Close">×</button><strong>Need help choosing a plan?</strong><a href="https://wa.me/919869622564?text='+encodeURIComponent('Hi Spacyes, please help me choose the right plan.')+'" target="_blank" rel="noopener">Chat with us →</a>';
    help.querySelector('.wa-help-close').addEventListener('click',function(){help.remove()});document.body.appendChild(help);
  }
})();
});
