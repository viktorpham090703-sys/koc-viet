from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt


SOURCE = Path(r"D:\Download\Bao_Gia_Viettel_Cloud.docx")
OUTPUT = Path(r"D:\Khoadilam\NetViet\NewKOC\koc-viet\docs\Bao_Gia_Viettel_Cloud_co_VAT.docx")


def shade(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_text(cell, text: str, bold: bool = False) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.size = Pt(10)


def add_summary_row(table, label: str, amount: str, *, bold: bool = False, fill: str | None = None) -> None:
    row = table.add_row()
    label_cell = row.cells[0]
    for index in range(1, 5):
        label_cell = label_cell.merge(row.cells[index])
    set_cell_text(label_cell, label, bold=bold)
    set_cell_text(row.cells[5], amount, bold=bold)
    if fill:
        shade(label_cell, fill)
        shade(row.cells[5], fill)


def main() -> None:
    document = Document(SOURCE)
    table = document.tables[0]

    # Keep the original header appearance while clarifying that listed prices
    # are before VAT.
    table.cell(0, 4).text = "Đơn giá trước VAT / (VNĐ)"
    table.cell(0, 5).text = "Thành tiền trước VAT / (VNĐ)"

    add_summary_row(table, "CỘNG TRƯỚC VAT", "1.738.000 VNĐ", bold=True, fill="E7E6E6")
    add_summary_row(table, "VAT (10%)", "173.800 VNĐ")
    add_summary_row(table, "TỔNG THANH TOÁN DỰ KIẾN", "1.911.800 VNĐ", bold=True, fill="FFF2CC")

    note = document.add_paragraph()
    note.paragraph_format.space_before = Pt(8)
    first = note.add_run("Ghi chú: ")
    first.bold = True
    note.add_run(
        "Giá dịch vụ trên website Viettel IDC chưa bao gồm VAT. "
        "Bảng này tạm tính VAT 10% cho dịch vụ điện toán đám mây. "
        "Mức thuế và tổng thanh toán cuối cùng cần được xác nhận trên báo giá, hợp đồng và hóa đơn chính thức của Viettel IDC."
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
