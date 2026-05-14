import { NextRequest, NextResponse } from 'next/server'
import { getAuctionConfig } from '@/lib/auction-config'
import { getExportDataset } from '@/lib/export-datasets'
import { getExperiment3Treatment } from '@/lib/experiment3-config'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const netid = searchParams.get('netid')?.trim().toLowerCase()
  const datasetKey = searchParams.get('dataset')?.trim() ?? 'auctions'

  if (!netid) {
    return NextResponse.json({ error: 'Missing netid' }, { status: 400 })
  }

  const dataset = getExportDataset(datasetKey)
  if (!dataset) {
    return NextResponse.json({ error: 'Invalid dataset' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  let csvPayload: { csv: string; filename: string }

  if (dataset.key === 'auctions') {
    const { data: bidRows, error: bidError } = await supabase
      .from('bids')
      .select('*')
      .eq('student_id', netid)
      .order('created_at', { ascending: true })

    if (bidError) {
      return NextResponse.json({ error: bidError.message ?? 'Export failed.' }, { status: 500 })
    }

    if (!bidRows || bidRows.length === 0) {
      return NextResponse.json({ empty: true }, { status: 404 })
    }

    const headers = [
      'id',
      'student_id',
      'auction_type',
      'auction_title',
      'round',
      'private_value',
      'amount',
      'created_at',
    ]
    const rows = bidRows.map((row) =>
      serializeCsvRow(headers, {
        id: row.id,
        student_id: row.student_id,
        auction_type: row.auction_type,
        auction_title: getAuctionConfig(row.auction_type)?.title ?? row.auction_type,
        round: row.round,
        private_value: row.private_value,
        amount: row.amount,
        created_at: row.created_at,
      })
    )
    csvPayload = {
      csv: [headers.join(','), ...rows].join('\n'),
      filename: `${netid}-${dataset.filenameSuffix}.csv`,
    }
  } else if (dataset.key === 'risk-aversion') {
    const { data: responseRows, error: responseError } = await supabase
      .from('risk_aversion_responses')
      .select('*')
      .eq('student_id', netid)
      .order('created_at', { ascending: true })

    if (responseError) {
      return NextResponse.json(
        { error: responseError.message ?? 'Export failed.' },
        { status: 500 }
      )
    }

    if (!responseRows || responseRows.length === 0) {
      return NextResponse.json({ empty: true }, { status: 404 })
    }

    const headers = [
      'id',
      'student_id',
      'p_10',
      'p_20',
      'p_30',
      'p_40',
      'p_50',
      'p_60',
      'p_70',
      'p_80',
      'p_90',
      'created_at',
    ]
    const rows = responseRows.map((row) =>
      serializeCsvRow(headers, {
        id: row.id,
        student_id: row.student_id,
        p_10: row.p_10,
        p_20: row.p_20,
        p_30: row.p_30,
        p_40: row.p_40,
        p_50: row.p_50,
        p_60: row.p_60,
        p_70: row.p_70,
        p_80: row.p_80,
        p_90: row.p_90,
        created_at: row.created_at,
      })
    )
    csvPayload = {
      csv: [headers.join(','), ...rows].join('\n'),
      filename: `${netid}-${dataset.filenameSuffix}.csv`,
    }
  } else if (dataset.key === 'exp4-group') {
    const { data: own, error: ownError } = await supabase
      .from('experiment4_responses')
      .select('*')
      .eq('student_id', netid)
      .maybeSingle()

    if (ownError) {
      return NextResponse.json({ error: ownError.message }, { status: 500 })
    }
    if (!own) {
      return NextResponse.json({ empty: true }, { status: 404 })
    }
    if (!own.group_id) {
      return NextResponse.json({ error: 'You have not been assigned to a group yet.' }, { status: 404 })
    }

    const { data: groupRows, error: groupError } = await supabase
      .from('experiment4_responses')
      .select('*')
      .eq('group_id', own.group_id)
      .order('created_at', { ascending: true })

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    const headers = ['student_id', 'bid_10']
    const others = (groupRows ?? []).filter((r) => r.student_id !== netid)
    const me = (groupRows ?? []).find((r) => r.student_id === netid)
    let anonCounter = 1
    const rows = [
      ...others.map((row) => serializeCsvRow(headers, { student_id: `Bidder ${anonCounter++}`, bid_10: row.bid_10 })),
      ...(me ? [serializeCsvRow(headers, { student_id: netid, bid_10: me.bid_10 })] : []),
    ]
    csvPayload = {
      csv: [headers.join(','), ...rows].join('\n'),
      filename: `${netid}-${dataset.filenameSuffix}.csv`,
    }
  } else {
    const { data: experiment3Rows, error: experiment3Error } = await supabase
      .from('experiment3_rounds')
      .select('*')
      .eq('student_id', netid)
      .order('global_round', { ascending: true })

    if (experiment3Error) {
      return NextResponse.json(
        { error: experiment3Error.message ?? 'Export failed.' },
        { status: 500 }
      )
    }

    if (!experiment3Rows || experiment3Rows.length === 0) {
      return NextResponse.json({ empty: true }, { status: 404 })
    }

    const headers = [
      'id',
      'student_id',
      'treatment_key',
      'treatment_title',
      'block_index',
      'round_in_treatment',
      'global_round',
      'bidder_count',
      'seller_value',
      'reserve_price',
      'simulated_bids',
      'highest_bid',
      'second_highest_bid',
      'sold',
      'sale_price',
      'profit',
      'created_at',
    ]
    const rows = experiment3Rows.map((row) =>
      serializeCsvRow(headers, {
        id: row.id,
        student_id: row.student_id,
        treatment_key: row.treatment_key,
        treatment_title: getExperiment3Treatment(row.treatment_key)?.title ?? row.treatment_key,
        block_index: row.block_index,
        round_in_treatment: row.round_in_treatment,
        global_round: row.global_round,
        bidder_count: row.bidder_count,
        seller_value: row.seller_value,
        reserve_price: row.reserve_price,
        simulated_bids: row.simulated_bids,
        highest_bid: row.highest_bid,
        second_highest_bid: row.second_highest_bid,
        sold: row.sold,
        sale_price: row.sale_price,
        profit: row.profit,
        created_at: row.created_at,
      })
    )
    csvPayload = {
      csv: [headers.join(','), ...rows].join('\n'),
      filename: `${netid}-${dataset.filenameSuffix}.csv`,
    }
  }

  return new Response(csvPayload.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${csvPayload.filename}"`,
    },
  })
}

function serializeCsvRow(headers: string[], row: Record<string, unknown>) {
  return headers.map((header) => serializeCsvValue(row[header])).join(',')
}

function serializeCsvValue(value: unknown) {
  const normalized =
    value == null
      ? ''
      : Array.isArray(value) || typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

  return `"${normalized.replaceAll('"', '""')}"`
}
