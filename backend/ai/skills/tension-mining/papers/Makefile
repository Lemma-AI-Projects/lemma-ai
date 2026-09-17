# Makefile for Tension Mining arXiv paper
# Requirements: pdflatex, bibtex

TEX = tension-mining-arxiv
PDF = $(TEX).pdf
SRC = $(TEX).tex
BIB = $(TEX).bib

.PHONY: all clean distclean view

all: $(PDF)

$(PDF): $(SRC) $(BIB)
	pdflatex $(TEX)
	bibtex $(TEX)
	pdflatex $(TEX)
	pdflatex $(TEX)

view: $(PDF)
	@echo "Open $(PDF) to view"

clean:
	rm -f *.aux *.bbl *.blg *.log *.out *.toc *.lof *.lot *~ $(TEX).pdf

distclean: clean
	rm -f $(PDF)