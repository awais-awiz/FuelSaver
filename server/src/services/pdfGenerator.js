import PDFDocument from 'pdfkit';

function formatDuration(minutes) {
  if (!minutes) return 'N/A';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export function streamRoutePdf(routeDoc, res) {
  const originSlug = (routeDoc.origin || 'route').replace(/[^a-zA-Z0-9]+/g, '_');
  const destSlug = (routeDoc.destination || 'dest').replace(/[^a-zA-Z0-9]+/g, '_');
  const filename = `FuelPlan_${originSlug}_to_${destSlug}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
  doc.pipe(res);

  // Charcoal + Signal Orange Header Bar
  doc.rect(0, 0, doc.page.width, 92).fill('#1C1917');
  doc.rect(0, 92, doc.page.width, 4).fill('#EA580C');

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('FuelSaver', 48, 26);
  doc
    .fillColor('#FDBA74')
    .font('Helvetica')
    .fontSize(10.5)
    .text('Driver Fuel Dispatch Plan & Step-by-Step Refueling Pathway', 48, 54);

  const createdStr = routeDoc.created_at
    ? new Date(routeDoc.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleDateString();

  doc
    .fillColor('#D6D3D1')
    .fontSize(9.5)
    .text(`Generated: ${createdStr}`, 350, 32, { align: 'right', width: 214 })
    .text(`Max Range: ${Math.round((routeDoc.mpg || 10) * (routeDoc.tank_capacity || 50))} miles`, 350, 48, {
      align: 'right',
      width: 214,
    });

  // Route Corridor Headline (ASCII-safe for built-in Helvetica WinAnsi encoding)
  doc
    .fillColor('#1C1917')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(`${routeDoc.origin}  to  ${routeDoc.destination}`, 48, 116);

  doc
    .fillColor('#57534E')
    .font('Helvetica')
    .fontSize(10)
    .text(
      `Vehicle: ${routeDoc.mpg} MPG  •  Tank Capacity: ${routeDoc.tank_capacity} gal  •  Est. Drive Time: ${formatDuration(
        routeDoc.duration_minutes
      )}`,
      48,
      140
    );

  // 4 Clean Summary KPI Boxes
  const stations = routeDoc.chosen_stations || [];
  const kpis = [
    {
      label: 'OPTIMIZED FUEL COST',
      value: `$${Number(routeDoc.overall_expense || 0).toFixed(2)}`,
      bg: '#1C1917',
      labelColor: '#A8A29E',
      valColor: '#FFFFFF',
    },
    {
      label: 'ESTIMATED SAVINGS',
      value: `$${Number(routeDoc.estimated_savings || 0).toFixed(2)}`,
      bg: '#FFF7ED',
      labelColor: '#C2410C',
      valColor: '#EA580C',
    },
    {
      label: 'TOTAL DISTANCE',
      value: `${Math.round(routeDoc.dist_miles || 0).toLocaleString('en-US')} mi`,
      bg: '#F5F5F4',
      labelColor: '#57534E',
      valColor: '#1C1917',
    },
    {
      label: 'FUEL STOPS',
      value: `${stations.length} ${stations.length === 1 ? 'stop' : 'stops'}`,
      bg: '#F5F5F4',
      labelColor: '#57534E',
      valColor: '#1C1917',
    },
  ];

  const boxWidth = 122;
  const boxGap = 9;
  kpis.forEach((kpi, i) => {
    const x = 48 + i * (boxWidth + boxGap);
    const y = 164;
    doc.roundedRect(x, y, boxWidth, 56, 6).fill(kpi.bg);
    doc
      .fillColor(kpi.labelColor)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(kpi.label, x + 10, y + 11, { width: boxWidth - 20 });
    doc
      .fillColor(kpi.valColor)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(kpi.value, x + 10, y + 27, { width: boxWidth - 20 });
  });

  // Step-by-Step Route Pathway Section
  doc
    .fillColor('#1C1917')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('Step-by-Step Route & Refueling Pathway', 48, 244);

  let y = 268;
  const cols = [
    { label: 'Step', x: 48, w: 50, align: 'left' },
    { label: 'Station / Location & Highway Exit', x: 98, w: 214, align: 'left' },
    { label: 'Mile / Leg', x: 312, w: 68, align: 'right' },
    { label: 'Price/Gal', x: 380, w: 60, align: 'right' },
    { label: 'Gallons', x: 440, w: 56, align: 'right' },
    { label: 'Cost', x: 496, w: 68, align: 'right' },
  ];

  const drawTableHeader = (topY) => {
    doc.rect(48, topY, 516, 24).fill('#292524');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    cols.forEach((c) => {
      doc.text(c.label, c.x + 4, topY + 7, { width: c.w - 8, align: c.align });
    });
  };

  drawTableHeader(y);
  y += 24;

  // Row 0: START (Origin)
  doc.rect(48, y, 516, 28).fill('#FFFBEB');
  doc.fillColor('#B45309').font('Helvetica-Bold').fontSize(8.5).text('START', cols[0].x + 4, y + 9);
  doc
    .fillColor('#1C1917')
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(routeDoc.origin || 'Origin', cols[1].x + 4, y + 9, { width: cols[1].w - 8, ellipsis: true });
  doc.fillColor('#57534E').font('Helvetica').fontSize(8.5).text('Mile 0', cols[2].x + 4, y + 9, {
    width: cols[2].w - 8,
    align: 'right',
  });
  doc.text('—', cols[3].x + 4, y + 9, { width: cols[3].w - 8, align: 'right' });
  doc.text('—', cols[4].x + 4, y + 9, { width: cols[4].w - 8, align: 'right' });
  doc.text('—', cols[5].x + 4, y + 9, { width: cols[5].w - 8, align: 'right' });
  doc.moveTo(48, y + 28).lineTo(564, y + 28).strokeColor('#E7E5E4').lineWidth(0.5).stroke();
  y += 28;

  // Fuel Stop Rows
  let totalGallons = 0;
  let totalStopCost = 0;

  stations.forEach((s, idx) => {
    const rowHeight = s.address ? 38 : 28;
    if (y + rowHeight > 685) {
      doc.addPage();
      y = 48;
      drawTableHeader(y);
      y += 24;
    }

    const prevMile = idx === 0 ? 0 : stations[idx - 1].mile_marker || 0;
    const currMile = s.mile_marker || 0;
    const legMiles = Math.max(0, Math.round(currMile - prevMile));
    totalGallons += Number(s.gallons || 0);
    totalStopCost += Number(s.cost || 0);

    if (idx % 2 === 1) {
      doc.rect(48, y, 516, rowHeight).fill('#FAFAF9');
    }

    doc
      .fillColor('#EA580C')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(`STOP ${idx + 1}`, cols[0].x + 4, y + 8);

    doc
      .fillColor('#1C1917')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(s.name || 'Truck Stop', cols[1].x + 4, y + 7, {
        width: cols[1].w - 8,
        ellipsis: true,
        lineBreak: false,
      });

    doc
      .fillColor('#57534E')
      .font('Helvetica')
      .fontSize(8)
      .text(
        `${s.city || ''}, ${s.state || ''}${s.address ? ` · ${s.address}` : ''}`,
        cols[1].x + 4,
        y + 20,
        { width: cols[1].w - 8, ellipsis: true, lineBreak: false }
      );

    doc
      .fillColor('#1C1917')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(`Mi ${currMile}`, cols[2].x + 4, y + 7, { width: cols[2].w - 8, align: 'right' });
    doc
      .fillColor('#78716C')
      .font('Helvetica')
      .fontSize(7.5)
      .text(`+${legMiles} mi leg`, cols[2].x + 4, y + 19, { width: cols[2].w - 8, align: 'right' });

    doc
      .fillColor('#B45309')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`$${Number(s.price || 0).toFixed(3)}`, cols[3].x + 4, y + 10, {
        width: cols[3].w - 8,
        align: 'right',
      });

    doc
      .fillColor('#1C1917')
      .font('Helvetica')
      .fontSize(9)
      .text(`${Number(s.gallons || 0).toFixed(1)}`, cols[4].x + 4, y + 10, {
        width: cols[4].w - 8,
        align: 'right',
      });

    doc
      .fillColor('#1C1917')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(`$${Number(s.cost || 0).toFixed(2)}`, cols[5].x + 4, y + 10, {
        width: cols[5].w - 8,
        align: 'right',
      });

    doc.moveTo(48, y + rowHeight).lineTo(564, y + rowHeight).strokeColor('#E7E5E4').lineWidth(0.5).stroke();
    y += rowHeight;
  });

  // Final Row: ARRIVE (Destination)
  const finalMile = Math.round(routeDoc.dist_miles || 0);
  const lastStopMile = stations.length > 0 ? stations[stations.length - 1].mile_marker || 0 : 0;
  const finalLeg = Math.max(0, finalMile - lastStopMile);

  doc.rect(48, y, 516, 28).fill('#FEF2F2');
  doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(8.5).text('ARRIVE', cols[0].x + 4, y + 9);
  doc
    .fillColor('#1C1917')
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(routeDoc.destination || 'Destination', cols[1].x + 4, y + 9, {
      width: cols[1].w - 8,
      ellipsis: true,
    });
  doc
    .fillColor('#57534E')
    .font('Helvetica')
    .fontSize(8)
    .text(`Mi ${finalMile} (+${finalLeg})`, cols[2].x + 4, y + 9, {
      width: cols[2].w - 8,
      align: 'right',
    });
  doc.text('—', cols[3].x + 4, y + 9, { width: cols[3].w - 8, align: 'right' });
  doc.text('—', cols[4].x + 4, y + 9, { width: cols[4].w - 8, align: 'right' });
  doc.text('—', cols[5].x + 4, y + 9, { width: cols[5].w - 8, align: 'right' });
  y += 28;

  // Totals Breakdown Rows (so every gallon and dollar reconciles to the penny)
  const overallCost = Number(routeDoc.overall_expense || totalStopCost);
  const totalTripGallons =
    routeDoc.mpg > 0 ? Number((Number(routeDoc.dist_miles || 0) / Number(routeDoc.mpg)).toFixed(1)) : totalGallons;
  const startingFuelGallons = Math.max(0, Number((totalTripGallons - totalGallons).toFixed(1)));
  const startingFuelCost = Math.max(0, Number((overallCost - totalStopCost).toFixed(2)));

  if (y + 84 > 710) {
    doc.addPage();
    y = 48;
  }

  // Row A: Intermediate Stops Subtotal
  doc.rect(48, y, 516, 24).fill('#F5F5F4');
  doc
    .fillColor('#44403C')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text('Intermediate Stops Subtotal', 56, y + 7, { width: 320 });
  doc
    .fillColor('#1C1917')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(`${totalGallons.toFixed(1)} gal`, cols[4].x + 4, y + 7, {
      width: cols[4].w - 8,
      align: 'right',
    });
  doc.text(`$${totalStopCost.toFixed(2)}`, cols[5].x + 4, y + 7, {
    width: cols[5].w - 8,
    align: 'right',
  });
  doc.moveTo(48, y + 24).lineTo(564, y + 24).strokeColor('#E7E5E4').lineWidth(0.5).stroke();
  y += 24;

  // Row B: Starting Tank Fuel & Detour Allowance (if any)
  if (startingFuelCost > 0.01) {
    doc.rect(48, y, 516, 24).fill('#FAFAF9');
    doc
      .fillColor('#57534E')
      .font('Helvetica')
      .fontSize(8.5)
      .text('Initial Departure Fuel (Origin to Stop 1) & Detours', 56, y + 7, { width: 320 });
    doc
      .fillColor('#57534E')
      .font('Helvetica')
      .fontSize(8.5)
      .text(`${startingFuelGallons.toFixed(1)} gal`, cols[4].x + 4, y + 7, {
        width: cols[4].w - 8,
        align: 'right',
      });
    doc.text(`$${startingFuelCost.toFixed(2)}`, cols[5].x + 4, y + 7, {
      width: cols[5].w - 8,
      align: 'right',
    });
    doc.moveTo(48, y + 24).lineTo(564, y + 24).strokeColor('#E7E5E4').lineWidth(0.5).stroke();
    y += 24;
  }

  // Row C: Grand Total Trip Fuel Cost
  doc.rect(48, y, 516, 28).fill('#1C1917');
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('TOTAL TRIP FUEL COST', 56, y + 9, { width: 320 });
  doc
    .fillColor('#FDBA74')
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(`${totalTripGallons.toFixed(1)} gal`, cols[4].x + 4, y + 9, {
      width: cols[4].w - 8,
      align: 'right',
    });
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`$${overallCost.toFixed(2)}`, cols[5].x + 4, y + 8, {
      width: cols[5].w - 8,
      align: 'right',
    });

  // Page Footer
  doc
    .fillColor('#A8A29E')
    .font('Helvetica')
    .fontSize(8.5)
    .text(
      'Generated by FuelSaver MERN — Optimal US Interstate Fuel Routing',
      48,
      doc.page.height - 44,
      { align: 'center', width: 516 }
    );

  doc.end();
}
