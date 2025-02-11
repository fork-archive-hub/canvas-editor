import { ElementType, RowFlex } from '../..'
import { ZERO } from '../../dataset/constant/Common'
import { ControlComponent, ImageDisplay } from '../../dataset/enum/Control'
import { IComputePageRowPositionPayload, IComputePageRowPositionResult } from '../../interface/Position'
import { IEditorOption } from '../../interface/Editor'
import { IElementPosition } from '../../interface/Element'
import { ICurrentPosition, IGetPositionByXYPayload, IPositionContext } from '../../interface/Position'
import { Draw } from '../draw/Draw'

export class Position {

  private cursorPosition: IElementPosition | null
  private positionContext: IPositionContext
  private positionList: IElementPosition[]

  private draw: Draw
  private options: Required<IEditorOption>

  constructor(draw: Draw) {
    this.positionList = []
    this.cursorPosition = null
    this.positionContext = {
      isTable: false,
      isControl: false
    }

    this.draw = draw
    this.options = draw.getOptions()
  }

  public getOriginalPositionList(): IElementPosition[] {
    return this.positionList
  }

  public getPositionList(): IElementPosition[] {
    const { isTable } = this.positionContext
    if (isTable) {
      const { index, trIndex, tdIndex } = this.positionContext
      const elementList = this.draw.getOriginalElementList()
      return elementList[index!].trList![trIndex!].tdList[tdIndex!].positionList || []
    }
    return this.positionList
  }

  public setPositionList(payload: IElementPosition[]) {
    this.positionList = payload
  }

  private computePageRowPosition(payload: IComputePageRowPositionPayload): IComputePageRowPositionResult {
    const { positionList, rowList, pageNo, startX, startY, startIndex, innerWidth } = payload
    const { scale, tdPadding } = this.options
    let x = startX
    let y = startY
    let index = startIndex
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 计算行偏移量（行居中、居右）
      if (curRow.rowFlex === RowFlex.CENTER) {
        x += (innerWidth - curRow.width) / 2
      } else if (curRow.rowFlex === RowFlex.RIGHT) {
        x += innerWidth - curRow.width
      }
      // 当前td所在位置
      const tablePreX = x
      const tablePreY = y
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        const offsetY =
          (element.imgDisplay !== ImageDisplay.INLINE && element.type === ElementType.IMAGE)
            || element.type === ElementType.LATEX
            ? curRow.ascent - metrics.height
            : curRow.ascent
        const positionItem: IElementPosition = {
          pageNo,
          index,
          value: element.value,
          rowNo: i,
          metrics,
          ascent: offsetY,
          lineHeight: curRow.height,
          isLastLetter: j === curRow.elementList.length - 1,
          coordinate: {
            leftTop: [x, y],
            leftBottom: [x, y + curRow.height],
            rightTop: [x + metrics.width, y],
            rightBottom: [x + metrics.width, y + curRow.height]
          }
        }
        positionList.push(positionItem)
        index++
        x += metrics.width
        // 计算表格内元素位置
        if (element.type === ElementType.TABLE) {
          const tdGap = tdPadding * 2
          for (let t = 0; t < element.trList!.length; t++) {
            const tr = element.trList![t]
            for (let d = 0; d < tr.tdList!.length; d++) {
              const td = tr.tdList[d]
              td.positionList = []
              const drawRowResult = this.computePageRowPosition({
                positionList: td.positionList,
                rowList: td.rowList!,
                pageNo,
                startIndex: 0,
                startX: (td.x! + tdPadding) * scale + tablePreX,
                startY: td.y! * scale + tablePreY,
                innerWidth: (td.width! - tdGap) * scale
              })
              x = drawRowResult.x
              y = drawRowResult.y
            }
          }
          // 恢复初始x、y
          x = tablePreX
          y = tablePreY
        }
      }
      x = startX
      y += curRow.height
    }
    return { x, y, index }
  }

  public computePositionList() {
    // 置空原位置信息
    this.positionList = []
    // 按每页行计算
    const innerWidth = this.draw.getInnerWidth()
    const pageRowList = this.draw.getPageRowList()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = margins[0]
    for (let i = 0; i < pageRowList.length; i++) {
      const rowList = pageRowList[i]
      const startIndex = rowList[0].startIndex
      this.computePageRowPosition({
        positionList: this.positionList,
        rowList,
        pageNo: i,
        startIndex,
        startX,
        startY,
        innerWidth
      })
    }
  }

  public setCursorPosition(position: IElementPosition | null) {
    this.cursorPosition = position
  }

  public getCursorPosition(): IElementPosition | null {
    return this.cursorPosition
  }

  public getPositionContext(): IPositionContext {
    return this.positionContext
  }

  public setPositionContext(payload: IPositionContext) {
    this.positionContext = payload
  }

  public getPositionByXY(payload: IGetPositionByXYPayload): ICurrentPosition {
    const { x, y, isTable } = payload
    let { elementList, positionList } = payload
    if (!elementList) {
      elementList = this.draw.getOriginalElementList()
    }
    if (!positionList) {
      positionList = this.positionList
    }
    const curPageNo = this.draw.getPageNo()
    for (let j = 0; j < positionList.length; j++) {
      const { index, pageNo, coordinate: { leftTop, rightTop, leftBottom } } = positionList[j]
      if (curPageNo !== pageNo) continue
      // 命中元素
      if (leftTop[0] <= x && rightTop[0] >= x && leftTop[1] <= y && leftBottom[1] >= y) {
        let curPositionIndex = j
        const element = elementList[j]
        // 表格被命中
        if (element.type === ElementType.TABLE) {
          for (let t = 0; t < element.trList!.length; t++) {
            const tr = element.trList![t]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              const tablePosition = this.getPositionByXY({
                x,
                y,
                td,
                tablePosition: positionList[j],
                isTable: true,
                elementList: td.value,
                positionList: td.positionList
              })
              if (~tablePosition.index) {
                const { index: tdValueIndex } = tablePosition
                const tdValueElement = td.value[tdValueIndex]
                return {
                  index,
                  isCheckbox: tdValueElement.type === ElementType.CHECKBOX ||
                    tdValueElement.controlComponent === ControlComponent.CHECKBOX,
                  isControl: tdValueElement.type === ElementType.CONTROL,
                  isImage: tablePosition.isImage,
                  isDirectHit: tablePosition.isDirectHit,
                  isTable: true,
                  tdIndex: d,
                  trIndex: t,
                  tdValueIndex,
                  tdId: td.id,
                  trId: tr.id,
                  tableId: element.id
                }
              }
            }
          }
        }
        // 图片区域均为命中
        if (element.type === ElementType.IMAGE || element.type === ElementType.LATEX) {
          return {
            index: curPositionIndex,
            isDirectHit: true,
            isImage: true
          }
        }
        if (
          element.type === ElementType.CHECKBOX ||
          element.controlComponent === ControlComponent.CHECKBOX
        ) {
          return {
            index: curPositionIndex,
            isDirectHit: true,
            isCheckbox: true
          }
        }
        // 判断是否在文字中间前后
        if (elementList[index].value !== ZERO) {
          const valueWidth = rightTop[0] - leftTop[0]
          if (x < leftTop[0] + valueWidth / 2) {
            curPositionIndex = j - 1
          }
        }
        return {
          index: curPositionIndex,
          isControl: element.type === ElementType.CONTROL,
        }
      }
    }
    // 非命中区域
    let isLastArea = false
    let curPositionIndex = -1
    // 判断是否在表格内
    if (isTable) {
      const { td, tablePosition } = payload
      if (td && tablePosition) {
        const { leftTop } = tablePosition.coordinate
        const tdX = td.x! + leftTop[0]
        const tdY = td.y! + leftTop[1]
        const tdWidth = td.width!
        const tdHeight = td.height!
        if (!(tdX < x && x < tdX + tdWidth && tdY < y && y < tdY + tdHeight)) {
          return {
            index: curPositionIndex
          }
        }
      }
    }
    // 判断所属行是否存在元素
    const firstLetterList = positionList.filter(p => p.isLastLetter && p.pageNo === curPageNo)
    for (let j = 0; j < firstLetterList.length; j++) {
      const { index, pageNo, coordinate: { leftTop, leftBottom } } = firstLetterList[j]
      if (curPageNo !== pageNo) continue
      if (y > leftTop[1] && y <= leftBottom[1]) {
        const isHead = x < this.options.margins[3]
        // 是否在头部
        if (isHead) {
          const headIndex = positionList.findIndex(p => p.pageNo === curPageNo && p.rowNo === firstLetterList[j].rowNo)
          curPositionIndex = ~headIndex ? headIndex - 1 : index
        } else {
          curPositionIndex = index
        }
        isLastArea = true
        break
      }
    }
    if (!isLastArea) {
      // 当前页最后一行
      return { index: firstLetterList[firstLetterList.length - 1]?.index || positionList.length - 1 }
    }
    return {
      index: curPositionIndex,
      isControl: elementList[curPositionIndex]?.type === ElementType.CONTROL
    }
  }

  public adjustPositionContext(payload: Pick<IGetPositionByXYPayload, 'x' | 'y'>): ICurrentPosition {
    const isReadonly = this.draw.isReadonly()
    const { x, y } = payload
    const positionResult = this.getPositionByXY({
      x,
      y
    })
    // 移动控件内光标
    if (positionResult.isControl && !isReadonly) {
      const {
        index,
        isTable,
        trIndex,
        tdIndex,
        tdValueIndex
      } = positionResult
      const control = this.draw.getControl()
      const { newIndex } = control.moveCursor({
        index,
        isTable,
        trIndex,
        tdIndex,
        tdValueIndex
      })
      if (isTable) {
        positionResult.tdValueIndex = newIndex
      } else {
        positionResult.index = newIndex
      }
    }
    const {
      index,
      isCheckbox,
      isControl,
      isTable,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId
    } = positionResult
    // 设置位置上下文
    this.setPositionContext({
      isTable: isTable || false,
      isCheckbox: isCheckbox || false,
      isControl: isControl || false,
      index,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId
    })
    return positionResult
  }

}