import pytest
from app.ingestion.parsers.claims_parser import ClaimsParser
from app.ingestion.parsers.cpc_parser import CPCParser
from app.ingestion.parsers.ipc_parser import IPCParser
from app.ingestion.normalizer import PatentNormalizer
from app.schemas.unified_patent import UnifiedPatent

@pytest.mark.asyncio
async def test_claims_parser():
    parser = ClaimsParser()
    raw_claims = """
    1. A method for battery management, comprising:
       charging a battery; and
       monitoring temperature of the battery.
    2. The method of claim 1, further comprising cooling the battery.
    3. The method of claims 1 or 2, wherein the monitoring step is performed continuously.
    """
    claims = await parser.parse(raw_claims)
    assert len(claims) == 3
    assert claims[0].num == 1
    assert claims[0].claim_type == "independent"
    assert claims[1].num == 2
    assert claims[1].claim_type == "dependent"
    assert claims[1].depends_on == [1]
    assert claims[2].num == 3
    assert claims[2].depends_on == [1, 2]


@pytest.mark.asyncio
async def test_cpc_parser():
    parser = CPCParser()
    cpc = await parser.parse_from_symbol("H04L63/1416")
    assert cpc is not None
    assert cpc.symbol == "H04L63/1416"
    assert cpc.section == "H"
    assert cpc.cls == "04"
    assert cpc.subclass == "L"
    assert cpc.group == "63/1416"
    assert cpc.description == "Electricity"

    # Test parser from dict
    dicts = [{"symbol": "G06F17/30"}, "A61K31/00"]
    parsed_list = await parser.parse_from_dict_list(dicts)
    assert len(parsed_list) == 2
    assert parsed_list[0].symbol == "G06F17/30"
    assert parsed_list[1].symbol == "A61K31/00"


@pytest.mark.asyncio
async def test_ipc_parser():
    parser = IPCParser()
    ipc = await parser.parse_from_symbol("H04L 63/14")
    assert ipc is not None
    assert ipc.symbol == "H04L 63/14"
    assert ipc.section == "H"
    assert ipc.cls == "04"
    assert ipc.subclass == "L"
    assert ipc.main_group == "63"
    assert ipc.subgroup == "14"


@pytest.mark.asyncio
async def test_patent_normalizer():
    normalizer = PatentNormalizer()
    raw = {
        "patent_number": "US11223344",
        "title": "Quantum Computing Device",
        "abstract": "An abstract describing quantum logic gates.",
        "claims": [{"num": "1", "text": "1. A device comprising logic gates."}],
        "cpc_classifications": ["G06N10/00"],
        "ipc_classifications": ["G06N 10/00"],
        "inventors": [{"name": "Alice Smith"}, "Bob Jones"],
        "assignees": [{"name": "Quantum Corp"}],
        "publication_date": "2026-06-17",
        "source": "uspto",
    }
    
    unified = await normalizer.normalize(raw)
    assert isinstance(unified, UnifiedPatent)
    assert unified.patent_number == "US11223344"
    assert unified.title == "Quantum Computing Device"
    assert unified.abstract == "An abstract describing quantum logic gates."
    assert len(unified.claims) == 1
    assert unified.claims[0].num == 1
    assert len(unified.cpc_classifications) == 1
    assert unified.cpc_classifications[0].symbol == "G06N10/00"
    assert len(unified.ipc_classifications) == 1
    assert unified.ipc_classifications[0].symbol == "G06N 10/00"
    assert len(unified.inventors) == 2
    assert unified.inventors[0].name == "Alice Smith"
    assert unified.inventors[1].name == "Bob Jones"
    assert len(unified.assignees) == 1
    assert unified.assignees[0].name == "Quantum Corp"
    assert unified.publication_date == "2026-06-17"
