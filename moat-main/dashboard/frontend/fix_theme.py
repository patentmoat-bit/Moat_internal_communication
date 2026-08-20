import re

with open("src/app/dashboard/admin/recovery/page.tsx", "r") as f:
    content = f.read()

# Remove the Phase 9 Verified span
content = re.sub(
    r'<span className="px-2\.5 py-0\.5 rounded-full bg-\[#c9a84c\]/20 border border-\[#c9a84c\]/40 text-\[#c9a84c\] text-xs font-bold tracking-wider uppercase">\s*Phase 9 Verified\s*</span>',
    '',
    content
)

# Colors
replacements = [
    ('bg-[#0e0e08]', 'bg-gray-50'),
    ('text-gray-100', 'text-gray-800'),
    ('bg-white/[0.02]', 'bg-white'),
    ('bg-white/[0.03]', 'bg-white'),
    ('bg-white/5', 'bg-white'),
    ('bg-white/10', 'bg-gray-100'),
    ('border-white/10', 'border-gray-200'),
    ('border-white/5', 'border-gray-100'),
    ('text-white', 'text-gray-900'),
    ('text-gray-300', 'text-gray-700'),
    ('text-gray-400', 'text-gray-500'),
    ('text-[#e8dfc8]', 'text-gray-800'),
    ('bg-black/30', 'bg-gray-50'),
    ('bg-black/40', 'bg-gray-100'),
    ('bg-black/50', 'bg-gray-50'),
    ('bg-black/70', 'bg-white'),
    ('bg-[#16160e]', 'bg-white'),
    ('bg-[#160e0e]', 'bg-white'),
    ('bg-black/80', 'bg-gray-900/60'),
    ('bg-black/85', 'bg-gray-900/60'),
    ('divide-white/5', 'divide-gray-100'),
    ('hover:bg-white/[0.03]', 'hover:bg-gray-50'),
    ('hover:text-white', 'hover:text-gray-900'),
    ('text-gray-200', 'text-gray-800'),
    ('text-red-300', 'text-red-700'),
    ('bg-red-500/20', 'bg-red-50'),
    ('border-red-500/30', 'border-red-200'),
    ('border-red-500/40', 'border-red-200'),
    ('bg-emerald-500/20', 'bg-emerald-50'),
    ('border-emerald-500/30', 'border-emerald-200'),
    ('bg-blue-500/20', 'bg-blue-50'),
    ('border-blue-500/30', 'border-blue-200'),
    ('border-emerald-500/40', 'border-emerald-200'),
    ('bg-emerald-950/80', 'bg-emerald-50'),
    ('text-emerald-200', 'text-emerald-800'),
    ('bg-red-950/80', 'bg-red-50'),
    ('text-red-200', 'text-red-800'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/app/dashboard/admin/recovery/page.tsx", "w") as f:
    f.write(content)
