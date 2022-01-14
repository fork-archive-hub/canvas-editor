import './style.css'
import Editor, { ElementType, IEditorResult, IElement } from './editor'
import { Dialog } from './components/dialog/Dialog'
import request from './utils/request'
import { queryParams } from './utils'

window.onload = function () {
  init()
}

let id: number
let name: string
async function init() {
  // 菜单
  const articleList = await getArticleList()
  appendArticle(articleList)
  const articleAddDom = document.querySelector<HTMLDivElement>('.article-add')!
  articleAddDom.onclick = () => {
    createArticle()
  }
  const articleBtnDom = document.querySelector<HTMLDivElement>('.article-btn')!
  articleBtnDom.onclick = () => {
    document.querySelector<HTMLDivElement>('.article-container')!
      .classList.toggle('visible')
  }
  // 文章
  const idParam = queryParams('id')
  id = idParam ? Number(idParam) : articleList[0].id
  const article = await getArticleDetail(id)
  name = article.name
  let data: IElement[] = []
  try {
    const content = <IEditorResult>JSON.parse(article.content)
    data = Array.isArray(content.data) ? content.data : []
  } catch (error) {
    alert('数据格式错误')
  }
  initEditorInstance(data)
}

function initEditorInstance(data: IElement[]) {
  // 初始化编辑器
  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(container, <IElement[]>data, {
    margins: [100, 120, 100, 120],
    header: {
      data: name
    }
  })
  console.log('实例: ', instance)

  // 撤销、重做、格式刷、清除格式
  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.onclick = function () {
    console.log('undo')
    instance.command.executeUndo()
  }
  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.onclick = function () {
    console.log('redo')
    instance.command.executeRedo()
  }
  const painterDom = document.querySelector<HTMLDivElement>('.menu-item__painter')!
  painterDom.onclick = function () {
    console.log('painter')
    instance.command.executePainter()
  }
  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick = function () {
    console.log('format')
    instance.command.executeFormat()
  }

  // 字体、字体变大、字体变小、加粗、斜体、下划线、删除线、字体颜色、背景色
  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = function () {
    console.log('font')
    fontOptionDom.classList.toggle('visible')
  }
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }
  document.querySelector<HTMLDivElement>('.menu-item__size-add')!.onclick = function () {
    console.log('size-add')
    instance.command.executeSizeAdd()
  }
  document.querySelector<HTMLDivElement>('.menu-item__size-minus')!.onclick = function () {
    console.log('size-minus')
    instance.command.executeSizeMinus()
  }
  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.onclick = function () {
    console.log('bold')
    instance.command.executeBold()
  }
  const italicDom = document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.onclick = function () {
    console.log('italic')
    instance.command.executeItalic()
  }
  const underlineDom = document.querySelector<HTMLDivElement>('.menu-item__underline')!
  underlineDom.onclick = function () {
    console.log('underline')
    instance.command.executeUnderline()
  }
  const strikeoutDom = document.querySelector<HTMLDivElement>('.menu-item__strikeout')!
  strikeoutDom.onclick = function () {
    console.log('strikeout')
    instance.command.executeStrikeout()
  }
  const superscriptDom = document.querySelector<HTMLDivElement>('.menu-item__superscript')!
  superscriptDom.onclick = function () {
    console.log('superscript')
    instance.command.executeSuperscript()
  }
  const subscriptDom = document.querySelector<HTMLDivElement>('.menu-item__subscript')!
  subscriptDom.onclick = function () {
    console.log('subscript')
    instance.command.executeSubscript()
  }
  const colorControlDom = document.querySelector<HTMLInputElement>('#color')!
  colorControlDom.onchange = function () {
    instance.command.executeColor(colorControlDom!.value)
  }
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = function () {
    console.log('color')
    colorControlDom.click()
  }
  const highlightControlDom = document.querySelector<HTMLInputElement>('#highlight')!
  highlightControlDom.onchange = function () {
    instance.command.executeHighlight(highlightControlDom.value)
  }
  const highlightDom = document.querySelector<HTMLDivElement>('.menu-item__highlight')!
  const highlightSpanDom = highlightDom.querySelector('span')!
  highlightDom.onclick = function () {
    console.log('highlight')
    highlightControlDom?.click()
  }
  // 行布局
  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.onclick = function () {
    console.log('left')
    instance.command.executeLeft()
  }
  const centerDom = document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.onclick = function () {
    console.log('center')
    instance.command.executeCenter()
  }
  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.onclick = function () {
    console.log('right')
    instance.command.executeRight()
  }
  const rowMarginDom = document.querySelector<HTMLDivElement>('.menu-item__row-margin')!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = function () {
    console.log('row-margin')
    rowOptionDom.classList.toggle('visible')
  }
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }
  // 表格插入、图片上传、搜索、打印
  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>('.menu-item__table__collapse')!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  // 绘制行列
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  // 移除所有格选择
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => {
      tr.forEach(td => td.classList.remove('active'))
    })
  }
  // 设置标题内容
  function setTableTitle(payload: string) {
    tableTitle.innerText = payload
  }
  // 恢复初始状态
  function recoveryTable() {
    // 还原选择样式、标题、选择行列
    removeAllTableCellSelect()
    setTableTitle('插入')
    colIndex = 0
    rowIndex = 0
    // 隐藏panel
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = function () {
    console.log('table')
    tablePanelContainer!.style.display = 'block'
  }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16
    const rowMarginTop = 10
    const celMarginRight = 6
    const { offsetX, offsetY } = evt
    // 移除所有选择
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    // 改变选择样式
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) {
          td.classList.add('active')
        }
      })
    })
    // 改变表格标题
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = function () {
    recoveryTable()
  }
  tablePanel.onclick = function () {
    // 应用选择
    instance.command.executeInsertTable(rowIndex, colIndex)
    recoveryTable()
  }
  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
  const imageFileDom = document.querySelector<HTMLInputElement>('#image')!
  imageDom.onclick = function () {
    imageFileDom.click()
  }
  imageFileDom.onchange = function () {
    const file = imageFileDom.files?.[0]!
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = function () {
      // 计算宽高
      const image = new Image()
      const value = fileReader.result as string
      image.src = value
      image.onload = function () {
        instance.command.executeImage({
          value,
          width: image.width,
          height: image.height,
        })
        imageFileDom.value = ''
      }
    }
  }
  const hyperlinkDom = document.querySelector<HTMLDivElement>('.menu-item__hyperlink')!
  hyperlinkDom.onclick = function () {
    console.log('hyperlink')
    new Dialog({
      title: '超链接',
      data: [{
        type: 'text',
        label: '文本',
        name: 'name',
        placeholder: '请输入文本'
      }, {
        type: 'text',
        label: '链接',
        name: 'url',
        placeholder: '请输入链接'
      }],
      onConfirm: (payload) => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({
          type: ElementType.HYPERLINK,
          value: '',
          url,
          valueList: name.split('').map(n => ({
            value: n,
            size: 16
          }))
        })
      }
    })
  }
  const collspanDom = document.querySelector<HTMLDivElement>('.menu-item__search__collapse')
  const searchInputDom = document.querySelector<HTMLInputElement>('.menu-item__search__collapse__search input')
  document.querySelector<HTMLDivElement>('.menu-item__search')!.onclick = function () {
    console.log('search')
    collspanDom!.style.display = 'block'
  }
  document.querySelector<HTMLDivElement>('.menu-item__search__collapse span')!.onclick = function () {
    collspanDom!.style.display = 'none'
    searchInputDom!.value = ''
    instance.command.executeSearch(null)
  }
  searchInputDom!.oninput = function () {
    instance.command.executeSearch(searchInputDom?.value || null)
  }
  searchInputDom!.onkeydown = function (evt) {
    if (evt.key === 'Enter') {
      instance.command.executeSearch(searchInputDom?.value || null)
    }
  }
  document.querySelector<HTMLDivElement>('.menu-item__print')!.onclick = function () {
    console.log('print')
    instance.command.executePrint()
  }
  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick = function () {
    console.log('page-scale-recovery')
    instance.command.executePageScaleRecovery()
  }
  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick = function () {
    console.log('page-scale-minus')
    instance.command.executePageScaleMinus()
  }
  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick = function () {
    console.log('page-scale-add')
    instance.command.executePageScaleAdd()
  }

  // 内部事件监听
  instance.listener.rangeStyleChange = function (payload) {
    // 控件类型
    payload.type === ElementType.SUBSCRIPT ? subscriptDom.classList.add('active') : subscriptDom.classList.remove('active')
    payload.type === ElementType.SUPERSCRIPT ? superscriptDom.classList.add('active') : superscriptDom.classList.remove('active')
    // 富文本
    const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(`[data-family=${payload.font}]`)!
    fontSelectDom.innerText = curFontDom.innerText
    fontOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    curFontDom.classList.add('active')
    payload.bold ? boldDom.classList.add('active') : boldDom.classList.remove('active')
    payload.italic ? italicDom.classList.add('active') : italicDom.classList.remove('active')
    payload.underline ? underlineDom.classList.add('active') : underlineDom.classList.remove('active')
    payload.strikeout ? strikeoutDom.classList.add('active') : strikeoutDom.classList.remove('active')
    if (payload.color) {
      colorDom.classList.add('active')
      colorControlDom.value = payload.color
      colorSpanDom.style.backgroundColor = payload.color
    } else {
      colorDom.classList.remove('active')
      colorControlDom.value = '#000000'
      colorSpanDom.style.backgroundColor = '#000000'
    }
    if (payload.highlight) {
      highlightDom.classList.add('active')
      highlightControlDom.value = payload.highlight
      highlightSpanDom.style.backgroundColor = payload.highlight
    } else {
      highlightDom.classList.remove('active')
      highlightControlDom.value = '#ffff00'
      highlightSpanDom.style.backgroundColor = '#ffff00'
    }
    // 行布局
    leftDom.classList.remove('active')
    centerDom.classList.remove('active')
    rightDom.classList.remove('active')
    if (payload.rowFlex && payload.rowFlex === 'right') {
      rightDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'center') {
      centerDom.classList.add('active')
    } else {
      leftDom.classList.add('active')
    }
    // 行间距
    rowOptionDom.querySelectorAll<HTMLLIElement>('li').forEach(li => li.classList.remove('active'))
    const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(`[data-rowmargin='${payload.rowMargin}']`)!
    curRowMarginDom.classList.add('active')
    // 功能
    payload.undo ? undoDom.classList.remove('no-allow') : undoDom.classList.add('no-allow')
    payload.redo ? redoDom.classList.remove('no-allow') : redoDom.classList.add('no-allow')
    payload.painter ? painterDom.classList.add('active') : painterDom.classList.remove('active')
  }

  instance.listener.visiblePageNoListChange = function (payload) {
    const text = payload.map(i => i + 1).join('、')
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = text
  }

  instance.listener.pageSizeChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-size')!.innerText = `${payload}`
  }

  instance.listener.intersectionPageNoChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${payload + 1}`
  }

  instance.listener.pageScaleChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-scale-percentage')!.innerText = `${Math.floor(payload * 10 * 10)}%`
  }

  instance.listener.saved = function (payload) {
    console.log('elementList: ', payload)
    updateArticle(payload)
  }
}

interface IArticleList {
  id: number;
  name: string;
  updateAt: string;
}
async function getArticleList(): Promise<IArticleList[]> {
  const { data } = await request('/api/article/v1/list/by_example')
  return <IArticleList[]>data
}

function appendArticle(articleList: IArticleList[]) {
  const articleListDom = document.querySelector<HTMLDivElement>('.article-list')!
  articleListDom.childNodes.forEach(child => child.remove())
  articleList.forEach(article => {
    const articleDom = document.createElement('div')
    articleDom.append(document.createTextNode(article.name))
    const articleDate = document.createElement('span')
    articleDate.append(document.createTextNode(article.updateAt))
    articleDom.append(articleDate)
    articleDom.onclick = () => {
      const { origin, pathname } = window.location
      window.location.href = `${origin}${pathname}?id=${article.id}`
    }
    articleListDom.append(articleDom)
  })
}

interface IArticleDetail {
  id: number;
  name: string;
  content: string;
}
async function getArticleDetail(id: number): Promise<IArticleDetail> {
  const result = await request('/api/article/v1/get/by_id', {
    id
  })
  return <IArticleDetail>result.data
}

async function createArticle() {
  const name = window.prompt('请输入名称')
  if (!name) return
  const result = await request('/api/article/v1/add', {
    name,
    content: JSON.stringify([])
  })
  const { origin, pathname } = window.location
  window.location.href = `${origin}${pathname}?id=${result.data}`
}

async function updateArticle(content: IEditorResult) {
  await request('/api/article/v1/update', {
    id,
    name,
    content: JSON.stringify(content)
  })
  alert('更新成功')
}