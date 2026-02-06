export function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300 pt-8 pb-24 md:pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center flex flex-col items-center">
                <img
                    src="/tabalong-smart.png"
                    alt="Logo Tabalong Smart"
                    className="h-12 w-auto mb-4 opacity-90"
                />
                <p className="font-semibold text-white mb-2">Bidang Pembinaan SD - Disdikbud Tabalong</p>
                <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Si-PANDU SD. All rights reserved.</p>
            </div>
        </footer>
    );
}
