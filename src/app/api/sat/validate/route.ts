import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface CfdiInput { uuid: string; rfcEmisor: string; rfcReceptor: string; total: number }

const RFC_RE  = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
const UUID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/
const TOTAL_RE = /^\d{1,12}(\.\d{1,6})?$/

/** Valida el formato antes de interpolar en el XML SOAP; evita inyección en la consulta. */
function esCfdiValido(c: Partial<CfdiInput>): c is CfdiInput {
  return typeof c?.uuid === "string" && UUID_RE.test(c.uuid.toUpperCase().trim())
    && typeof c.rfcEmisor === "string" && RFC_RE.test(c.rfcEmisor.toUpperCase().trim())
    && typeof c.rfcReceptor === "string" && RFC_RE.test(c.rfcReceptor.toUpperCase().trim())
    && TOTAL_RE.test(String(c.total).replace(/,/g,""))
}

async function consultarSAT(cfdi: CfdiInput) {
  const rfcE = cfdi.rfcEmisor.toUpperCase().trim()
  const rfcR = cfdi.rfcReceptor.toUpperCase().trim()
  let tt = String(cfdi.total).replace(/,/g,"")
  if (!tt.includes(".")) tt += ".00"
  else if (tt.split(".")[1].length === 1) tt += "0"
  const soap = `<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/"><soapenv:Header/><soapenv:Body><tem:Consulta><tem:expresionImpresa>?re=${rfcE}&amp;rr=${rfcR}&amp;tt=${tt}&amp;id=${cfdi.uuid.toUpperCase()}</tem:expresionImpresa></tem:Consulta></soapenv:Body></soapenv:Envelope>`
  try {
    const res = await fetch("https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc", {
      method:"POST", headers:{"Content-Type":"text/xml;charset=utf-8","SOAPAction":"http://tempuri.org/IConsultaCFDIService/Consulta"}, body:soap
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const pick = (...tags: string[]) => { for(const t of tags){const m=xml.match(new RegExp(`<(?:[^:>]+:)?${t}>([^<]+)<\\/(?:[^:>]+:)?${t}>`));if(m)return m[1].trim()} return null }
    let estado = pick("Estado")
    if (!estado) { if(xml.includes("Vigente")) estado="Vigente"; else if(xml.includes("Cancelado")) estado="Cancelado"; else estado="No Encontrado" }
    return { ok:true, metodo:"sat-soap", estado, vigente:estado==="Vigente", codigoEstatus:pick("CodigoEstatus") }
  } catch(e:any) { return { ok:false, metodo:"local", estado:"Error", vigente:false, satError:e.message } }
}

export async function POST(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })
  const body = await request.json()
  const cfdis: CfdiInput[] = Array.isArray(body.cfdis) ? body.cfdis : [body]
  const results = await Promise.allSettled(cfdis.slice(0,60).map(c =>
    esCfdiValido(c) ? consultarSAT(c) : Promise.resolve({ ok:false, metodo:"local", estado:"Error", vigente:false, satError:"Datos del CFDI inválidos" })))
  return NextResponse.json({
    resultados: results.map((r,i) => ({ uuid:cfdis[i]?.uuid, ...(r.status==="fulfilled"?r.value:{ok:false,estado:"Error"}) })),
    total: cfdis.length,
  })
}

