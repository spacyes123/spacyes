document.addEventListener('DOMContentLoaded',function(){

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
if(!d.name||!d.phone){alert('Please enter your name and phone.');return}
var msg='Hi Spacyes!\n\nName: '+d.name+'\nPhone: '+d.phone;
if(d.branch)msg+='\nBranch: '+d.branch;
if(d.plan)msg+='\nPlan: '+d.plan;
if(d.city)msg+='\nCity: '+d.city;
if(d.investment)msg+='\nInvestment: '+d.investment;
if(d.about)msg+='\nAbout: '+d.about;
if(d.message)msg+='\nMessage: '+d.message;
window.open('https://wa.me/919869622564?text='+encodeURIComponent(msg),'_blank');
})}
if(emb){emb.addEventListener('click',function(e){
e.preventDefault();var d=get();
if(!d.name||!d.phone){alert('Please enter your name and phone.');return}
var body='Name: '+d.name+'\nPhone: '+d.phone;
if(d.branch)body+='\nBranch: '+d.branch;
if(d.plan)body+='\nPlan: '+d.plan;
if(d.city)body+='\nCity: '+d.city;
if(d.investment)body+='\nInvestment: '+d.investment;
if(d.about)body+='\nAbout: '+d.about;
if(d.message)body+='\nMessage: '+d.message;
var subj=d.city?'Franchise Enquiry — Spacyes':'Trial Booking — Spacyes';
window.location.href='mailto:info@spacyes.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
})}
}
document.querySelectorAll('.form-wrap[id]').forEach(function(form){wireForm(form.id)});
(function(){
  var path=window.location.pathname;
  var prefix=(path.indexOf('/branches/')!==-1||path.indexOf('/blog/')!==-1)?'../':'';
  if(!document.querySelector('.mobile-action-bar')){
    var bar=document.createElement('div');bar.className='mobile-action-bar';bar.setAttribute('aria-label','Quick contact actions');
    bar.innerHTML='<a href="'+prefix+'index.html#plans">View Plans</a><a href="tel:+919869622564">Call</a><a class="wa-action" href="https://wa.me/919869622564?text='+encodeURIComponent('Hi Spacyes, I need help choosing a membership plan.')+'" target="_blank" rel="noopener">WhatsApp</a>';
    document.body.appendChild(bar);
  }
  if(!document.querySelector('.wa-help')){
    var help=document.createElement('div');help.className='wa-help';help.innerHTML='<button class="wa-help-close" aria-label="Close">×</button><strong>Need help choosing a plan?</strong><a href="https://wa.me/919869622564?text='+encodeURIComponent('Hi Spacyes, please help me choose the right plan.')+'" target="_blank" rel="noopener">Chat with us →</a>';
    help.querySelector('.wa-help-close').addEventListener('click',function(){help.remove()});document.body.appendChild(help);
  }
})();
});