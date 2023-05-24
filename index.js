// 模式选择：预习，学习，练习，实战等
// 跳过  -> 完成
// 只复习错误的 -> 完成
// 不提醒
// 选择题
const PATH = 'questions/spark';

const selection = window.getSelection();
let tstep = 1, qstep = 1, lastBlanks = [];
const fn = (answer, blank, { signal }) => answer.addEventListener('mouseover',
    () => {blank.classList.add('viewed');tstep = qstep = 0}, { signal });
(async () => {

    const data = await (await fetch(PATH + '/spark.json')).json();
    const items = Object.keys(data);

    (function theme(tid = 0) {
        new Promise((resolve, reject) => {
            if (!items[tid]) {
                reject('done');
                return;
            }
            const li = document.createElement('li');
            const h1 = document.createElement('h1');
            h1.innerText = items[tid];
            li.appendChild(h1);
            main.appendChild(li);

            tstep = 1;
            const ol = document.createElement('ol');
            li.appendChild(ol);
            (function question(qid = 0) {
                new Promise((resolve1, reject1) => {
                    const ls = Array.from(data[items[tid]][qid] || []);
                    const blanks = [];
                    const answers = [];
                    const editable = [];
                    if (ls.length === 0) {
                        tstep === 0 && main.lastChild.remove();
                        reject1(tid + tstep);
                        return;
                    } else if (ls.length === 1) {
                        const li = document.createElement('li');
                        li.innerHTML = `<p>${ls[0]}</p>`;
                        ol.appendChild(li);
                        resolve1(qid + qstep);
                        return;
                    } else if (ls.length === 2 && 'string' !== typeof ls[1]) {
                        const li = document.createElement('li');
                        const obj = document.createElement('object');
                        obj.data = PATH + '/' + ls[0];
                        li.appendChild(obj);
                        ol.appendChild(li);

                        resolve1(qid + qstep);
                        return;
                        /*
                        
                        TODO
                        
                        
                        Object.keys(ls[1]).forEach(k => {
                            blanks.push(ls[1][k]);
                        });
                        for (let i in ls[1]) {
                            const blank = obj.contentDocument.querySelector(i);
                            blank.answer = ls[1][i];
                            blank.style.fill = '#0000';
                            editable.push(document.createElement('span'));
                        }*/
                    } else {
                        const item = ls.shift().split('{}').map((s, i) => s + (ls[i]
                        ? `<span class="blank">${ls[i]}</span>` : ''));

                        const li = document.createElement('li');
                        li.innerHTML = `<p>${item.join('')}</p>`.repeat(3);
                        li.style = qstep ? 'animation:fake reverse .3s forwards' : 'position:relative';
                        li.firstChild.classList.add('edit');
                        li.children[1].classList.add('answer');
                        ol.appendChild(li);

                        qstep = 1;
                        blanks.push(... li.lastChild.querySelectorAll('.blank'));
                        answers.push(... li.children[1].querySelectorAll('.blank'));
                        editable.push(... li.firstChild.querySelectorAll('.blank'));
                        editable.forEach((edit, i) => {
                            edit.next = editable[i + 1];
                            if (lastBlanks.length && !lastBlanks[i]) {
                                blanks[i].classList.add('show');
                                edit.classList.add('hide');
                                edit.blank = blanks[i];
                            } else {
                                edit.textContent = '';
                                fn(edit.answer = answers[i],
                                   edit.blank = blanks[i],
                                   edit.controller = new AbortController());
                            }
                        });
                    }

                    (function fillblank(edit) {
                        new Promise((res, rej) => {
                            if (!edit) {
                                if (qstep) {
                                    lastBlanks = [];
                                    li.firstChild.remove();
                                    li.firstChild.remove();
                                    blanks.forEach(i => i.classList.add('show'));
                                } else {
                                    lastBlanks = blanks.map(b => b.classList.contains('viewed'));
                                    li.remove();
                                }
                                rej(qid + qstep);
                                return;
                            }
                            edit.contentEditable = 'true';
                            const ans = edit.answer.textContent;
                            widthDetector.firstChild.textContent = ans;
                            edit.oldInnerText = edit.innerText = '';
                            edit.addEventListener('paste', e => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text/plain');
                                selection.rangeCount && selection.getRangeAt(0).deleteContents();
                                edit.textContent = edit.textContent.substr(0, edit.startOffset) + text + edit.textContent.substr(edit.startOffset);
                                const range = document.createRange();
                                range.setStart(edit.childNodes[0] || edit, edit.startOffset + text.length);
                                range.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(range);
                                edit.startOffset += text.length;
                                edit.selectLength = 0;
                                edit.dispatchEvent(new Event('input')); 
                            });
                            edit.addEventListener('input', () => {
                                const startOffset = selection.getRangeAt(0).startOffset;
                                edit.textContent = edit.textContent;
                                selection.removeAllRanges();
                                const range = document.createRange();
                                range.setStart(edit.childNodes[0] || edit, edit.childNodes[0] ? startOffset : 0);
                                range.collapse(true);
                                selection.addRange(range);
                                edit.oldInnerText = edit.innerText;

                                // 检查输入的内容的长度是否超过原输入框的长度，若是则扩大原输入框。
                                widthDetector.lastChild.textContent = edit.textContent;
                                edit.blank.textContent = widthDetector.lastChild.offsetWidth > widthDetector.firstChild.offsetWidth
                                ? edit.textContent : edit.blank.textContent = ans;

                                // 检查是否是正确答案。
                                if ((edit.textContent.trim()===ans.trim())&&(edit.textContent.length===ans.length)) {
                                    edit.controller.abort();
                                    edit.contentEditable = 'false';
                                    do {edit = edit.next} while (edit?.blank.classList.contains('show'));
                                    res(edit);
                                    return;
                                }
                                edit.style.color = ans.slice(0, edit.textContent.length).trim().indexOf(edit.textContent.trim()) ? 'red' : '';
                            });
                            edit.addEventListener('keydown', e => {
                                if (e.code === 'Tab') {
                                    e.preventDefault();
                                    edit.controller.abort();
                                    edit.textContent = ans;
                                    edit.contentEditable = 'false';
                                    edit.blank.classList.add('skiped');
                                    do {edit = edit.next} while (edit?.blank.classList.contains('show'));
                                    res(edit);
                                }
                            });
                            edit.focus();
                            window.edit = edit;
    
                            // b.className = 'blank show';
                            // iptc.remove();
                            // res(b.next);
    
                        }).then(fillblank).catch(resolve1);
                    })(editable.find(i => !i.blank.classList.contains('show')));

                }).then(question).catch(resolve);
            })();  // end of function *question*
    
        }).then(theme).catch(console.log);
    })();  // end of function *theme*
    
    
})().then().catch();

// window 监视按键动作，实现按下 Alt+Shift 组合键时显示答案的效果。
const keys = {}
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (window.edit) {
        if ((keys['AltLeft'] || keys['AltRight']) && (keys['ShiftLeft'] || keys['ShiftRight'])) {
            window.edit.answer.style.color = 'black';
            window.edit.answer.style.backgroundColor = '#fffc';
            window.edit.blank.classList.add('viewed');
            tstep = qstep = 0;
        } else {
            window.edit.answer.style.color = '';
            window.edit.answer.style.backgroundColor = '';
        }
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (window.edit) {
        if ((keys['AltLeft'] || keys['AltRight']) && (keys['ShiftLeft'] || keys['ShiftRight'])) {
            window.edit.answer.style.color = 'black';
            window.edit.answer.style.backgroundColor = '#fffc';
            window.edit.blank.classList.add('viewed');
            tstep = qstep = 0;
        } else {
            window.edit.answer.style.color = '';
            window.edit.answer.style.backgroundColor = '';
        }
    }
});

// window 监视多个动作，实现自动切换焦点到编辑框的功能。
[ 'click', 'focus', 'keydown', 'keyup', 'blur' ]
    .forEach(type => window.addEventListener(type, () => {
    const edit = window.edit,
          range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange(),
          container = edit?.childNodes[0];
    if (edit) {
        edit.focus();

        if (!selection.rangeCount) {
            range.setStart(container || edit, container ? edit.startOffset : 0);
            range.collapse(true);
            selection.addRange(range);
        }
        // console.log(range?.startContainer, range?.startOffset);
        // 当焦点未在编辑框上时，使用 window 的 selection 对象，切换焦点到编辑框。
        if (![ edit, container ].includes(range?.startContainer ?? null)
         || (range?.startOffset === 0 && edit.startOffset !== 0 && !type.startsWith('key'))) {
            // console.log(type);
            if (container !== void 0) {  // 处理编辑框中 *有内容* 的情况
                range.setStart(container, edit.startOffset || 0);
                if (edit.selectLength && type !== 'click') {
                    range.setEnd(container, (edit.startOffset || 0) + edit.selectLength);
                } else {
                    range.collapse(true);
                }
            } else {  // 处理编辑框中 *没有内容* 的情况
                range.setStart(edit, 0);
                range.collapse(true);
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // 更新当前编辑框标记的的选中内容。
        edit.startOffset = range.startOffset;
        edit.selectLength = range.toString().length;
        // console.log(edit.startOffset, edit.selectLength);
    }
    // 修复因通过 Alt+Tab 组合键切换窗口时无法检测到 Alt 键的 keyup 动作导致的 Alt 键长按漏洞。
    if (!type.startsWith('key')) {
        keys['AltLeft'] = keys['AltRight'] = false;
    }
    return range;
}));

