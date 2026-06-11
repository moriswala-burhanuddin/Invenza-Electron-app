import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaxInclusionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (showTax: boolean) => void;
}

export function TaxInclusionDialog({ open, onOpenChange, onConfirm }: TaxInclusionDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-[2rem] border-white shadow-2xl p-10 max-w-[400px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">Include Tax?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-relaxed mt-2">
                        WOULD YOU LIKE TO INCLUDE SECTION D: TAX DETAILS AND VAT BREAKDOWN IN THIS DOCUMENT?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-10 sm:justify-center gap-4">
                    <AlertDialogCancel 
                        onClick={() => onConfirm(false)}
                        className="rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest border-2 border-slate-100 hover:bg-slate-50 transition-all px-10"
                    >
                        No
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={() => onConfirm(true)}
                        className="rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest bg-primary text-white hover:scale-[1.05] active:scale-[0.95] transition-all px-10 shadow-xl shadow-black/20"
                    >
                        Yes
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
