import xml.etree.ElementTree as ET
from typing import Any
from datetime import datetime


class PatentXMLParser:
    NAMESPACES = {
        "us": "http://www.uspto.gov/patent",
        "ep": "http://www.epo.org/patent",
        "wo": "http://www.wipo.int/patent",
    }

    async def parse(self, xml_content: str | bytes) -> dict[str, Any]:
        root = ET.fromstring(xml_content) if isinstance(xml_content, str) else ET.fromstring(xml_content.decode("utf-8"))
        tag = root.tag.lower()

        if "us-patent-grant" in tag:
            return await self._parse_us_grant(root)
        elif "application" in tag or "us-patent-application" in tag:
            return await self._parse_us_application(root)
        elif "epatent" in tag or "ep-patent" in tag:
            return await self._parse_ep_patent(root)
        elif "wipo" in tag or "international-application" in tag:
            return await self._parse_wipo_patent(root)
        else:
            return await self._parse_generic(root)

    async def _parse_us_grant(self, root: ET.Element) -> dict[str, Any]:
        return {
            "patent_number": self._get_text(root, ".//us:document-id/us:doc-number"),
            "title": self._get_text(root, ".//us:invention-title"),
            "abstract": self._get_text(root, ".//us:abstract"),
            "claims": self._extract_claims(root),
            "inventors": self._extract_inventors(root),
            "assignee": self._extract_assignee(root),
            "filing_date": self._parse_date(self._get_text(root, ".//us:filing-date")),
            "publication_date": self._parse_date(self._get_text(root, ".//us:publication-date")),
            "status": "granted",
            "cpc_classifications": self._extract_cpc(root),
            "ipc_classifications": self._extract_ipc(root),
            "citations": self._extract_citations(root),
            "source": "uspto",
            "source_format": "us-patent-grant",
        }

    async def _parse_us_application(self, root: ET.Element) -> dict[str, Any]:
        return {
            "patent_number": self._get_text(root, ".//us:document-id/us:doc-number"),
            "title": self._get_text(root, ".//us:invention-title"),
            "abstract": self._get_text(root, ".//us:abstract"),
            "claims": self._extract_claims(root),
            "inventors": self._extract_inventors(root),
            "assignee": self._extract_assignee(root),
            "filing_date": self._parse_date(self._get_text(root, ".//us:filing-date")),
            "publication_date": self._parse_date(self._get_text(root, ".//us:publication-date")),
            "status": "published",
            "cpc_classifications": self._extract_cpc(root),
            "ipc_classifications": self._extract_ipc(root),
            "citations": self._extract_citations(root),
            "source": "uspto",
            "source_format": "us-patent-application",
        }

    async def _parse_ep_patent(self, root: ET.Element) -> dict[str, Any]:
        return {
            "patent_number": self._get_text(root, ".//ep:document-id/ep:doc-number"),
            "title": self._get_text(root, ".//ep:invention-title"),
            "abstract": self._get_text(root, ".//ep:abstract"),
            "claims": self._extract_claims(root),
            "inventors": self._extract_inventors(root),
            "assignee": self._extract_assignee(root),
            "filing_date": self._parse_date(self._get_text(root, ".//ep:filing-date")),
            "publication_date": self._parse_date(self._get_text(root, ".//ep:publication-date")),
            "status": "granted",
            "cpc_classifications": self._extract_cpc(root),
            "ipc_classifications": self._extract_ipc(root),
            "citations": self._extract_citations(root),
            "source": "epo",
            "source_format": "ep-patent",
        }

    async def _parse_wipo_patent(self, root: ET.Element) -> dict[str, Any]:
        return {
            "patent_number": self._get_text(root, ".//wo:document-id/wo:doc-number"),
            "title": self._get_text(root, ".//wo:invention-title"),
            "abstract": self._get_text(root, ".//wo:abstract"),
            "claims": self._extract_claims(root),
            "inventors": self._extract_inventors(root),
            "assignee": self._extract_assignee(root),
            "filing_date": self._parse_date(self._get_text(root, ".//wo:filing-date")),
            "publication_date": self._parse_date(self._get_text(root, ".//wo:publication-date")),
            "status": "published",
            "cpc_classifications": self._extract_cpc(root),
            "ipc_classifications": self._extract_ipc(root),
            "citations": self._extract_citations(root),
            "source": "wipo",
            "source_format": "international-application",
        }

    async def _parse_generic(self, root: ET.Element) -> dict[str, Any]:
        return {
            "patent_number": self._get_text(root, ".//doc-number"),
            "title": self._get_text(root, ".//invention-title") or self._get_text(root, ".//title"),
            "abstract": self._get_text(root, ".//abstract"),
            "claims": self._extract_claims(root),
            "inventors": self._extract_inventors(root),
            "assignee": self._get_text(root, ".//assignee"),
            "filing_date": self._parse_date(self._get_text(root, ".//filing-date")),
            "publication_date": self._parse_date(self._get_text(root, ".//publication-date")),
            "status": "unknown",
            "cpc_classifications": self._extract_cpc(root),
            "ipc_classifications": self._extract_ipc(root),
            "citations": self._extract_citations(root),
            "source": "unknown",
            "source_format": "generic",
        }

    def _get_text(self, element: ET.Element, xpath: str) -> str | None:
        try:
            el = element.find(xpath, self.NAMESPACES)
            return el.text.strip() if el is not None and el.text else None
        except Exception:
            return None

    def _extract_claims(self, root: ET.Element) -> list[dict]:
        claims = []
        for ns in self.NAMESPACES.values():
            claim_els = root.findall(f".//{{{ns.split('/')[-1]}}}claim") if ns else []
            if not claim_els:
                claim_els = root.findall(".//claim")
            for i, claim in enumerate(claim_els):
                text = claim.text.strip() if claim.text else ""
                claims.append({"num": i + 1, "text": text})
        return claims if claims else None

    def _extract_inventors(self, root: ET.Element) -> list[dict]:
        inventors = []
        for inv in root.findall(".//inventor") or root.findall(".//applicant"):
            name = self._get_text(inv, ".//name") or self._get_text(inv, ".//last-name") or ""
            country = self._get_text(inv, ".//country") or ""
            if name:
                inventors.append({"name": name, "country": country})
        for ns in self.NAMESPACES.values():
            for inv in root.findall(f".//{{{ns.split('/')[-1]}}}inventor"):
                name = self._get_text(inv, ".//name") or ""
                country = self._get_text(inv, ".//country") or ""
                if name:
                    inventors.append({"name": name, "country": country})
        return inventors if inventors else None

    def _extract_assignee(self, root: ET.Element) -> str | None:
        for ns in self.NAMESPACES.values():
            assignee = self._get_text(root, f".//{{{ns.split('/')[-1]}}}assignee")
            if assignee:
                return assignee
        return self._get_text(root, ".//assignee")

    def _extract_cpc(self, root: ET.Element) -> list[dict]:
        cpc_classes = []
        for cpc in root.findall(".//classification-cpc") or root.findall(".//cpc"):
            section = self._get_text(cpc, ".//section") or ""
            class_val = self._get_text(cpc, ".//class") or ""
            subclass = self._get_text(cpc, ".//subclass") or ""
            group = self._get_text(cpc, ".//group") or ""
            if section and class_val:
                cpc_classes.append({
                    "cpc_class": f"{section}{class_val}",
                    "subclass": subclass,
                    "group": group,
                    "full": f"{section}{class_val}{subclass}{group}",
                })
        for ns in self.NAMESPACES.values():
            for cpc in root.findall(f".//{{{ns.split('/')[-1]}}}classification-cpc"):
                section = self._get_text(cpc, ".//section") or ""
                class_val = self._get_text(cpc, ".//class") or ""
                subclass = self._get_text(cpc, ".//subclass") or ""
                group = self._get_text(cpc, ".//group") or ""
                if section and class_val:
                    cpc_classes.append({
                        "cpc_class": f"{section}{class_val}",
                        "subclass": subclass,
                        "group": group,
                        "full": f"{section}{class_val}{subclass}{group}",
                    })
        return [dict(t) for t in {tuple(d.items()) for d in cpc_classes}] if cpc_classes else None

    def _extract_ipc(self, root: ET.Element) -> list[dict]:
        ipc_classes = []
        for ipc in root.findall(".//classification-ipc") or root.findall(".//ipc"):
            section = self._get_text(ipc, ".//section") or ""
            class_val = self._get_text(ipc, ".//class") or ""
            subclass = self._get_text(ipc, ".//subclass") or ""
            group = self._get_text(ipc, ".//group") or ""
            if section and class_val:
                ipc_classes.append({
                    "ipc_class": f"{section}{class_val}",
                    "subclass": subclass,
                    "group": group,
                    "full": f"{section}{class_val}{subclass}{group}",
                })
        return ipc_classes if ipc_classes else None

    def _extract_citations(self, root: ET.Element) -> list[dict]:
        citations = []
        for cite in root.findall(".//citation") or root.findall(".//us-citation"):
            pat_num = self._get_text(cite, ".//patent-number") or self._get_text(cite, ".//doc-number") or ""
            category = self._get_text(cite, ".//category") or "cited"
            country = self._get_text(cite, ".//country") or ""
            if pat_num:
                citations.append({
                    "patent_number": pat_num,
                    "category": category,
                    "country": country,
                })
        return citations if citations else None

    def _parse_date(self, date_str: str | None) -> str | None:
        if not date_str:
            return None
        for fmt in ("%Y%m%d", "%Y-%m-%d", "%Y/%m/%d", "%d.%m.%Y"):
            try:
                return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return date_str
