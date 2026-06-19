"""Unit tests for news feed parsing/filtering (pure — no network or database)."""

from __future__ import annotations

from app.models import NewsSource
from app.services import news

# Minimal RSS fixture: two World Cup items (one with a media:content image, one with an
# <img> only in the description) plus one unrelated item that must be filtered out.
_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test feed</title>
    <item>
      <title><![CDATA[Brasil x Haiti pela Copa do Mundo]]></title>
      <link>https://example.com/copa-brasil-haiti</link>
      <description><![CDATA[<p>Preview da partida da seleção.</p>]]></description>
      <pubDate>Thu, 18 Jun 2026 12:00:00 -0300</pubDate>
      <media:content url="https://example.com/img/brasil.jpg" />
    </item>
    <item>
      <title>Mundial: análise do grupo</title>
      <link>https://example.com/mundial-grupo</link>
      <description><![CDATA[<img src="https://example.com/img/grupo.jpg"/> Texto da análise.]]></description>
      <pubDate>Wed, 17 Jun 2026 09:30:00 -0300</pubDate>
    </item>
    <item>
      <title>Resultado do Campeonato Carioca sub-20</title>
      <link>https://example.com/carioca</link>
      <description>Notícia de clube, sem relação com o torneio.</description>
      <pubDate>Tue, 16 Jun 2026 18:00:00 -0300</pubDate>
    </item>
  </channel>
</rss>"""


def test_parse_feed_keeps_only_world_cup_items():
    items = news.parse_feed(NewsSource.GE, _RSS)
    links = {it.link for it in items}
    assert links == {
        "https://example.com/copa-brasil-haiti",
        "https://example.com/mundial-grupo",
    }


def test_parse_feed_extracts_media_and_fallback_image():
    by_link = {it.link: it for it in news.parse_feed(NewsSource.GE, _RSS)}
    assert by_link["https://example.com/copa-brasil-haiti"].image_url == "https://example.com/img/brasil.jpg"
    # No media:content → falls back to the <img> embedded in the description.
    assert by_link["https://example.com/mundial-grupo"].image_url == "https://example.com/img/grupo.jpg"


def test_parse_feed_strips_html_and_sets_source():
    item = next(it for it in news.parse_feed(NewsSource.TRIVELA, _RSS) if "brasil" in it.link)
    assert item.source is NewsSource.TRIVELA
    assert "<p>" not in item.summary and item.summary == "Preview da partida da seleção."
    assert item.published_at.year == 2026 and item.published_at.tzinfo is not None


def test_matches_world_cup():
    assert news.matches_world_cup("Copa do Mundo 2026")
    assert news.matches_world_cup("", "convocação da seleção")
    assert not news.matches_world_cup("Campeonato Carioca", "jogo de clube")
